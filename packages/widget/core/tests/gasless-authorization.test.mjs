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
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return {
    url: 'data:text/javascript,export const TransactionType = { Input: "input" };', shortCircuit: true,
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const { useGaslessAuthorization } = await import('../dist/esm/hooks/useGaslessAuthorization.js')
const { useGaslessAuthorizationStore: store } = await import('../dist/esm/stores/swapTransactionStore.js')
let root, container, observations
beforeEach(() => {
  store.setState({ authorizations: {} })
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
function Probe({ details }) {
  const result = useGaslessAuthorization(details)
  // Observe every commit: checking only the settled result misses the stale failure.
  useEffect(() => { observations.push({ id: details?.id, ...result }) })
  return null
}
const render = details => act(async () => root.render(createElement(StrictMode, null, createElement(Probe, { details }))))
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
