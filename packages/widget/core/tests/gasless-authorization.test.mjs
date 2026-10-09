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
// Keep the HTTP/browser graph out while exercising real SWR, hooks and persistence.
const apiModule = 'data:text/javascript,' + encodeURIComponent(`
  export const TransactionType = { Input: 'input' };
  export const requests = [];
  let response = { status: 'initiated' };
  export function setResponse(value) { response = value; }
  export default class Client {
    async GetGaslessAuthorizationAsync(id) {
      requests.push(id);
      return { data: response };
    }
  }
`)
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return { url: apiModule, shortCircuit: true }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const { SWRConfig, useSWRConfig } = await import('swr')
const { requests, setResponse } = await import(apiModule)
const { useGaslessAuthorization } = await import('../dist/esm/hooks/useGaslessAuthorization.js')
const { useGaslessAuthorizationStatus } = await import('../dist/esm/hooks/useGaslessAuthorizationStatus.js')
const { useGaslessAuthorizationStore: store, useDepositSignatureStore: signatures } = await import('../dist/esm/stores/swapTransactionStore.js')
let root, container, observations, config, mutateAuthorizationCache
beforeEach(() => {
  localStorage.clear()
  store.setState({ authorizations: {} })
  signatures.setState({ signatures: {} })
  requests.length = 0
  setResponse({ status: 'initiated' })
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
const selfPaidActions = [{ step: 'sign', status: 'completed' }, { step: 'publish', status: 'waiting' }]
const gaslessActions = [{ step: 'sign', signing_standard: 'permit2', status: 'completed' }]
function Probe({ details, actions, poll, authorization }) {
  mutateAuthorizationCache = useSWRConfig().mutate
  const fetchedAuthorization = useGaslessAuthorizationStatus(poll ? details?.id : undefined, actions)
  const result = useGaslessAuthorization(details, actions, poll ? fetchedAuthorization : authorization)
  // Check every committed render, including those before cleanup effects run.
  useEffect(() => { observations.push({ id: details?.id, fetchedAuthorization, ...result }) })
  return null
}
const render = (details, actions, poll = false, authorization) => act(async () => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: config }, createElement(Probe, { details, actions, poll, authorization })))))
const authorize = (id, validBefore) => store.getState().setGaslessAuthorization(id, validBefore)

test('an overdue signature receipt cannot declare authorization expiry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 })
  authorize('A', 1)
  await render(swap())
  await act(async () => t.mock.timers.tick(60_000))
  assert.ok(observations.every(result => !result.failed))
  assert.deepEqual(store.getState().authorizations.A, { kind: 'gasless', validBefore: 1 })
})

for (const status of ['rejected', 'insufficient', 'expired']) {
  test(`fetched ${status} is authoritative without a stored outcome`, async () => {
    await render(swap(), gaslessActions, false, { status })
    assert.equal(observations.at(-1).failed, true)
    assert.equal(observations.at(-1).failureStatus, status)
    assert.equal(observations.at(-1).expired, status === 'expired')
    assert.deepEqual(store.getState().authorizations, {})
  })
}

for (const status of ['initiated', 'published', 'completed']) {
  test(`fetched ${status} overrides an overdue signed-action deadline`, async () => {
    authorize('A', 1)
    await render(swap(), undefined, false, { status })
    assert.ok(observations.every(result => !result.failed))
  })
}

for (const [name, details, actions] of [
  ['receives an input transaction', swap('A', { transactions: [{ type: 'input' }] }), undefined],
  ['advances beyond the deposit stage', swap('A', { status: 'ls_transfer_pending' }), undefined],
  ['discovers self-paid publication', swap(), selfPaidActions],
  ['has no active swap', undefined, undefined],
]) {
  test(`an old fetched failure cannot fail a swap that ${name}`, async () => {
    authorize('A', 1)
    await render(details, actions, false, { status: 'expired' })
    assert.ok(observations.every(result => !result.failed))
  })
}

test('a persisted prerequisite signature never starts gasless polling after reload', async () => {
  signatures.getState().setDepositSignature('A', 1)
  const saved = localStorage.getItem('depositSignatures')
  signatures.setState({ signatures: {} })
  localStorage.setItem('depositSignatures', saved)
  await signatures.persist.rehydrate()
  await render(swap(), undefined, true)
  await render(swap(), selfPaidActions, true)
  assert.deepEqual(requests, [])
  assert.equal(store.getState().authorizations.A, undefined)
  assert.ok(observations.every(result => !result.failed))
})

for (const status of [undefined, 'expired', 'completed']) {
  test(`a legacy ${status ?? 'unpolled'} self-paid marker cannot become backend authority`, async () => {
    localStorage.setItem('gaslessAuthorizations', JSON.stringify({
      state: { authorizations: { A: { validBefore: 1, status, transaction: { transaction_hash: 'old' } } } }, version: 0,
    }))
    await store.persist.rehydrate()
    assert.deepEqual(store.getState().authorizations.A, { validBefore: 1 })
    await render(swap(), undefined, true)
    await render(swap(), selfPaidActions, true)
    assert.ok(observations.every(result => !result.failed))
    assert.deepEqual(requests, [])
    assert.equal(store.getState().authorizations.A, undefined)
  })
}

for (const legacy of [false, true]) {
  test(`${legacy ? 'legacy' : 'new'} gasless signature polls without mirroring the fetched result`, async () => {
    if (legacy) store.setState({ authorizations: { A: { validBefore: 1 } } })
    else authorize('A', 1)
    await render(swap(), legacy ? gaslessActions : undefined, true)
    assert.deepEqual(requests, ['A'])
    assert.deepEqual(observations.at(-1).fetchedAuthorization, { status: 'initiated' })
    assert.deepEqual(store.getState().authorizations.A, legacy ? { validBefore: 1 } : { kind: 'gasless', validBefore: 1 })
    assert.ok(observations.every(result => !result.failed))
  })
}

test('gasless backend actions trigger authorization fetch without any local marker', async () => {
  await render(swap(), gaslessActions, true)
  assert.deepEqual(requests, ['A'])
  assert.deepEqual(observations.at(-1).fetchedAuthorization, { status: 'initiated' })
  assert.deepEqual(store.getState().authorizations, {})
})

for (const status of ['pending', 'completed']) {
  test(`a fetched ${status} EIP-3009 sign action recovers authorization failure on a fresh browser`, async () => {
    setResponse({ status: 'expired' })
    await render(swap(), [{ type: 'sign', signing_standard: 'eip3009', status }], true)
    assert.deepEqual(requests, ['A'])
    assert.deepEqual(observations.at(-1).fetchedAuthorization, { status: 'expired' })
    assert.equal(observations.at(-1).failureStatus, 'expired')
    assert.equal(observations.at(-1).failed, true)
    assert.deepEqual(store.getState().authorizations, {})
  })
}

test('a completed self-paid sign action never probes authorization on a fresh browser', async () => {
  await render(swap(), selfPaidActions, true)
  assert.deepEqual(requests, [])
  assert.ok(observations.every(result => !result.failed))
  assert.deepEqual(store.getState().authorizations, {})
})

test('reloading a saved terminal outcome always fetches the current backend authorization', async () => {
  localStorage.setItem('gaslessAuthorizations', JSON.stringify({
    state: { authorizations: { A: { kind: 'gasless', validBefore: 1, status: 'expired' } } }, version: 0,
  }))
  await store.persist.rehydrate()
  setResponse({ status: 'published', transaction: { transaction_hash: '0xcurrent', status: 'pending' } })
  await render(swap(), undefined, true)
  assert.deepEqual(requests, ['A'])
  assert.equal(observations.at(-1).fetchedAuthorization.status, 'published')
  assert.ok(observations.every(result => !result.failed))
  assert.deepEqual(store.getState().authorizations.A, { kind: 'gasless', validBefore: 1 })
})

test('invalidating a terminal authorization for a renewed signature restarts backend polling on the same key', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 })
  authorize('A', 1)
  setResponse({ status: 'expired' })
  await render(swap(), gaslessActions, true)
  assert.equal(observations.at(-1).failureStatus, 'expired')
  assert.deepEqual(requests, ['A'])

  setResponse({ status: 'initiated' })
  await act(async () => {
    await mutateAuthorizationCache('/swaps/A/authorize', undefined, { revalidate: false })
    authorize('A', 123)
  })
  assert.equal(observations.at(-1).fetchedAuthorization, undefined)
  assert.equal(observations.at(-1).failed, false, 'do not reuse the prior signature outcome')
  await act(async () => t.mock.timers.tick(4000))
  assert.deepEqual(requests, ['A', 'A'])
  assert.deepEqual(observations.at(-1).fetchedAuthorization, { status: 'initiated' })
  assert.deepEqual(store.getState().authorizations.A, { kind: 'gasless', validBefore: 123 })
})
