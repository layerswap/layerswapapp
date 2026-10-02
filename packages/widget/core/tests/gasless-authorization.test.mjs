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
  export default class Client {
    async GetGaslessAuthorizationAsync(id) {
      requests.push(id);
      return { data: { status: 'initiated' } };
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
const { requests } = await import(apiModule)
const { useGaslessAuthorization } = await import('../dist/esm/hooks/useGaslessAuthorization.js')
const { useGaslessAuthorizationStatus } = await import('../dist/esm/hooks/useGaslessAuthorizationStatus.js')
const { useGaslessAuthorizationStore: store, useDepositSignatureStore: signatures } = await import('../dist/esm/stores/swapTransactionStore.js')
let root, container, observations, config
beforeEach(() => {
  store.setState({ authorizations: {} })
  signatures.setState({ signatures: {} })
  requests.length = 0
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
function Probe({ details, actions, poll }) {
  const result = useGaslessAuthorization(details, actions)
  useGaslessAuthorizationStatus(poll ? details?.id : undefined, actions)
  // Observe every commit: checking only the settled result misses the stale failure.
  useEffect(() => { observations.push({ id: details?.id, ...result }) })
  return null
}
const render = (details, actions, poll = false) => act(async () => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: config }, createElement(Probe, { details, actions, poll })))))
const authorize = (id, validBefore) => store.getState().setGaslessAuthorization(id, validBefore)
const setStatus = status => store.getState().setGaslessAuthorizationStatus('A', status)

async function expire(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 })
  authorize('A', 101)
  await render(swap())
  assert.equal(observations.at(-1).failed, false)
  await act(async () => t.mock.timers.tick(30_999))
  assert.equal(observations.at(-1).failed, false, 'preserve the 30-second grace period')
  await act(async () => t.mock.timers.tick(1))
  assert.equal(observations.at(-1).failureStatus, 'expired')
  observations = []
}

const transitions = [
  ['switch to a swap without authorization', () => render(swap('B'))],
  ['clear the active swap', () => render(undefined)],
  ['remove authorization for retry', () => act(async () => store.getState().removeGaslessAuthorization('A'))],
  ['renew the authorization deadline', () => act(async () => authorize('A', 300))],
  ...['initiated', 'published', 'completed'].map(status => [
    `receive authoritative ${status} status`, () => act(async () => setStatus(status)),
  ]),
  ['receive an input transaction', () => render(swap('A', { transactions: [{ type: 'input' }] }))],
  ['leave the user-transfer-pending stage', () => render(swap('A', { status: 'ls_transfer_pending' }))],
]
for (const [name, transition] of transitions) {
  test(`expired timer cannot leak a failure when we ${name}`, async t => {
    await expire(t)
    await transition()
    assert.ok(observations.length > 0)
    assert.ok(observations.every(result => !result.failed), JSON.stringify(observations))
  })
}

test('switching swaps with the same deadline still expires the active swap', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 })
  authorize('A', 101)
  authorize('B', 101)
  await render(swap())
  await render(swap('B'))
  await act(async () => t.mock.timers.tick(31_000))
  assert.equal(observations.at(-1).id, 'B')
  assert.equal(observations.at(-1).failureStatus, 'expired')
})

test('polled failures remain authoritative after timer expiry', async t => {
  await expire(t)
  for (const status of ['rejected', 'insufficient', 'expired']) {
    await act(async () => setStatus(status))
    assert.equal(observations.at(-1).failed, true)
    assert.equal(observations.at(-1).failureStatus, status)
  }
})

const selfPaidActions = [
  { step: 'sign', status: 'completed' },
  { step: 'publish', status: 'waiting' },
]

test('a persisted prerequisite signature never starts gasless polling or expiry after reload', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 })
  signatures.getState().setDepositSignature('A', 101)
  const saved = localStorage.getItem('depositSignatures')
  signatures.setState({ signatures: {} })
  localStorage.setItem('depositSignatures', saved)
  await signatures.persist.rehydrate()
  assert.deepEqual(signatures.getState().signatures.A, { validBefore: 101 })
  await render(swap(), undefined, true)
  await render(swap(), selfPaidActions, true)
  await act(async () => t.mock.timers.tick(60_000))
  assert.deepEqual(requests, [])
  assert.equal(store.getState().authorizations.A, undefined)
  assert.ok(observations.every(result => !result.failed))
})

for (const status of [undefined, 'expired']) {
  test(`a legacy ${status ?? 'unpolled'} self-paid marker cannot fail while restored actions load`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 })
    localStorage.setItem('gaslessAuthorizations', JSON.stringify({
      state: { authorizations: { A: { validBefore: 1, status } } }, version: 0,
    }))
    await store.persist.rehydrate()
    await render(swap(), undefined, true)
    await act(async () => t.mock.timers.tick(60_000))
    await render(swap(), selfPaidActions, true)
    assert.ok(observations.every(result => !result.failed))
    assert.deepEqual(requests, [])
    assert.equal(store.getState().authorizations.A, undefined, 'discard the obsolete prerequisite marker')
  })
}

test('discovering self-paid publication cancels a prior gasless expiry immediately', async t => {
  await expire(t)
  await render(swap(), selfPaidActions, true)
  assert.ok(observations.every(result => !result.failed))
  assert.deepEqual(requests, [])
})

test('an actual transaction on an old self-paid marker is preserved without gasless failure', async () => {
  const transaction = { transaction_hash: '0xinput', status: 'pending' }
  store.setState({ authorizations: { A: { validBefore: 1, status: 'expired', transaction } } })
  await render(swap(), selfPaidActions, true)
  assert.equal(store.getState().authorizations.A.transaction, transaction)
  assert.ok(observations.every(result => !result.failed))
  assert.deepEqual(requests, [])
})

for (const legacy of [false, true]) {
  test(`${legacy ? 'legacy' : 'new'} gasless authorization still polls when its workflow is established`, async () => {
    if (legacy) store.setState({ authorizations: { A: { validBefore: Date.now() / 1000 + 60 } } })
    else authorize('A', Date.now() / 1000 + 60)
    const actions = legacy ? [{ step: 'sign', signing_standard: 'permit2', status: 'completed' }] : undefined
    await render(swap(), actions, true)
    assert.deepEqual(requests, ['A'])
    assert.equal(store.getState().authorizations.A.status, 'initiated')
    assert.ok(observations.every(result => !result.failed))
  })
}
