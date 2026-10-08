import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode, useEffect } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.test' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
const globals = {
  window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
}
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
// Keep the API client's browser dependency graph out; exercise the real hook and store.
const apiModule = 'data:text/javascript,' + encodeURIComponent(`
  export const TransactionType = { Input: 'input' };
  export const requests = [];
  export const state = { read: async () => ({ data: { status: 'initiated' } }) };
  export default class Client {
    async GetGaslessAuthorizationAsync(id) {
      requests.push(id);
      return state.read(id);
    }
  }
`)
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return {
    url: apiModule, shortCircuit: true,
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const { SWRConfig } = await import('swr')
const { requests, state } = await import(apiModule)
const { useGaslessAuthorization } = await import('../dist/esm/hooks/useGaslessAuthorization.js')
const { useGaslessAuthorizationStatus } = await import('../dist/esm/hooks/useGaslessAuthorizationStatus.js')
const { useGaslessAuthorizationStore: store, useDepositSignatureStore: signatures } = await import('../dist/esm/stores/swapTransactionStore.js')
let root, container, observations, config, statusResult
beforeEach(() => {
  store.setState({ authorizations: {} })
  signatures.setState({ signatures: {} })
  requests.length = 0
  state.read = async () => ({ data: { status: 'initiated' } })
  config = { provider: () => new Map(), revalidateOnFocus: false, revalidateOnReconnect: false }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  observations = []
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of Object.keys(globals)) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})

const swap = (id = 'A', extra = {}) => ({ id, status: 'user_transfer_pending', transactions: [], ...extra })
const gaslessActions = [{ step: 'sign', type: 'sign', signing_standard: 'permit2', status: 'completed' }]
const selfPaidActions = [{ step: 'sign', status: 'completed' }, { step: 'publish', status: 'waiting' }]
function Probe({ details, actions }) {
  statusResult = useGaslessAuthorizationStatus(details?.id, actions, true, details?.quote_revision)
  const result = useGaslessAuthorization(details, actions, statusResult.data?.data)
  useEffect(() => { observations.push({ id: details?.id, ...result, authorization: statusResult.data?.data }) })
  return null
}
const render = (details = swap(), actions = gaslessActions) => act(async () => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: config }, createElement(Probe, { details, actions })))))

for (const legacyStatus of [undefined, 'expired', 'published', 'completed']) {
  test(`backend authorization is read with ${legacyStatus ?? 'no'} local authorization after reload`, async () => {
    if (legacyStatus) {
      localStorage.setItem('gaslessAuthorizations', JSON.stringify({
        state: { authorizations: { A: { validBefore: 1, status: legacyStatus } } }, version: 0,
      }))
      await store.persist.rehydrate()
    }
    await render()
    assert.deepEqual(requests, ['A'])
    assert.equal(observations.at(-1).authorization.status, 'initiated')
    assert.equal(observations.at(-1).failed, false)
    assert.equal(store.getState().authorizations.A?.status, legacyStatus, 'the backend result stays in SWR')
  })
}

test('a browser deadline never fails an authorization during a backend outage', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 })
  signatures.getState().setDepositSignature('A', 101)
  store.setState({ authorizations: { A: { validBefore: 101 } } })
  state.read = async () => { throw new Error('Status unavailable') }
  await render()
  await act(async () => t.mock.timers.tick(60_000))
  assert.ok(observations.every(result => !result.failed))
})

for (const status of ['expired', 'insufficient', 'rejected']) {
  test(`a current backend ${status} response fails and a later correction is observed`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10_000 })
    state.read = async () => ({ data: { status } })
    await render()
    assert.equal(observations.at(-1).failureStatus, status)
    state.read = async () => ({ data: { status: 'published', transaction: { transaction_hash: '0xinput', status: 'pending' } } })
    await act(async () => t.mock.timers.tick(4000))
    assert.equal(requests.length, 2, 'terminal responses do not stop observation')
    assert.equal(observations.at(-1).failed, false)
    assert.equal(observations.at(-1).authorization.status, 'published')
  })
}

test('published authorization keeps polling until the swap backend takes over', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10_000 })
  state.read = async () => ({ data: { status: 'published' } })
  await render()
  state.read = async () => ({ data: { status: 'insufficient' } })
  await act(async () => t.mock.timers.tick(4000))
  assert.equal(observations.at(-1).failureStatus, 'insufficient')
})

test('404 is unresolved and a later authorization can be discovered', async () => {
  state.read = async () => { throw Object.assign(new Error('Not found'), { response: { status: 404 } }) }
  await render()
  assert.equal(observations.at(-1).failed, false)
  state.read = async () => ({ data: { status: 'expired' } })
  await act(async () => statusResult.mutate())
  assert.equal(observations.at(-1).failureStatus, 'expired')
})

test('an explicit self-paid workflow never polls authorize or trusts a legacy failure', async () => {
  store.setState({ authorizations: { A: { validBefore: 1, status: 'expired' } } })
  await render(swap(), selfPaidActions)
  assert.deepEqual(requests, [])
  assert.ok(observations.every(result => !result.failed))
})

test('authorization starts once signing actions are restored, without local evidence', async () => {
  await render(swap(), [])
  assert.deepEqual(requests, [])
  await render()
  assert.deepEqual(requests, ['A'])
})

for (const transaction of [undefined, { type: 'input', transaction_hash: '0xinput', status: 'pending' }]) {
  test(`advanced backend state${transaction ? ' with input' : ''} overrides authorization failure`, async () => {
    state.read = async () => ({ data: { status: 'expired' } })
    await render(swap('A', transaction ? { transactions: [transaction] } : { status: 'ls_transfer_pending' }))
    assert.ok(observations.every(result => !result.failed))
  })
}

test('a live authorization transaction overrides its failure label', async () => {
  state.read = async () => ({ data: { status: 'expired', transaction: { transaction_hash: '0xinput', status: 'pending' } } })
  await render()
  assert.equal(observations.at(-1).failed, false)
})

for (const changed of ['swap', 'quote']) {
  test(`a late failure for the previous ${changed} cannot leak into the active observation`, async () => {
    const delayed = Promise.withResolvers()
    let reads = 0
    state.read = async () => ++reads === 1 ? delayed.promise : { data: { status: 'published' } }
    await render(swap('A', { quote_revision: 1 }))
    await render(swap(changed === 'swap' ? 'B' : 'A', { quote_revision: 2 }))
    assert.equal(observations.at(-1).authorization.status, 'published')
    observations = []
    await act(async () => delayed.resolve({ data: { status: 'expired' } }))
    assert.ok(observations.every(result => !result.failed))
    assert.equal(statusResult.data.data.status, 'published')
  })
}
