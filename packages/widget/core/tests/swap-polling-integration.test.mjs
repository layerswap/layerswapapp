import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
// Only the network boundary is replaced. Poll timing, SWR, hooks, presentation resolver,
// callback provider and backend observer all run their production implementations.
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return {
    url: 'data:text/javascript,' + encodeURIComponent(`
      export default class Client { fetcher = key => globalThis.__swapTransport(key) }
      export const BackendTransactionStatus = { Completed:'completed', Failed:'failed', Pending:'pending', Initiated:'initiated' };
      export const TransactionStatus = { Completed:'completed', Failed:'failed', Pending:'pending' };
      export const TransactionType = { Input:'input', Output:'output', Refuel:'refuel', Refund:'refund' };
    `), shortCircuit: true,
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(specifier + '.js', context)
  return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const { SWRConfig } = await import('swr')
const { CallbackProvider, useCallbacks } = await import('../dist/esm/context/callbackProvider.js')
const { useSwapPolling } = await import('../dist/esm/hooks/useSwapPolling.js')
const { useSwapStatusNotification } = await import('../dist/esm/hooks/useSwapStatusNotification.js')
const { resolveSwapPhase } = await import('../dist/esm/components/utils/resolveSwapPhase.js')
const { resolveSwapPollingInterval } = await import('../dist/esm/lib/swapPollingPolicy.js')
let root, container, callbacks
beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); delete globalThis.__swapTransport })
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
  }
})

const input = { type: 'input', transaction_hash: 'tx-in', status: 'completed', amount: 1, confirmations: 1, max_confirmations: 1 }
const output = { type: 'output', transaction_hash: 'tx-out', status: 'completed', amount: 1 }
const refuel = { type: 'refuel', transaction_hash: 'tx-gas', status: 'completed', amount: 0.1 }
const payload = (status, transactions = [], extra = {}) => ({ data: { swap: { id: 's1', status, transactions, use_deposit_address: false }, ...extra } })

function Observe({ id = 's1', localStatus = 'pending', gaslessFailureStatus, showPanel = true }) {
  callbacks = useCallbacks()
  const { data } = useSwapPolling(id, undefined, 100)
  const swapDetails = data?.data?.swap
  useSwapStatusNotification(swapDetails?.id, swapDetails?.status, { path: 'SwapDataProvider' })
  const resolved = resolveSwapPhase({ swapDetails, refuel: data?.data?.refuel,
    storedWalletTransaction: { hash: 'tx-in', status: localStatus, timestamp: 100 }, gaslessFailureStatus })
  return showPanel ? createElement('output', null, resolved.phase) : null
}

function harness() {
  const events = []
  const cache = new Map()
  const config = { provider: () => cache, revalidateOnFocus: false, revalidateOnReconnect: false, isVisible: () => true }
  const render = (props = {}) => act(async () => root.render(createElement(StrictMode, null,
    createElement(SWRConfig, { value: config }, createElement(CallbackProvider,
      { callbacks: { onSwapStatusChange: event => events.push(event) } }, createElement(Observe, props))))))
  return { render, events }
}

test('local failure and wallet retries do not stop backend polling or replay status; completion is observed without a panel', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  let response = payload('user_transfer_pending')
  let requests = 0
  globalThis.__swapTransport = async () => { requests++; return response }
  const { render, events } = harness()
  await render()
  assert.equal(container.textContent, 'input_pending')
  await render({ localStatus: 'failed' })
  assert.equal(container.textContent, 'failed')
  const before = requests
  for (let i = 0; i < 3; i++) await act(async () => { t.mock.timers.tick(500) })
  assert.ok(requests > before, 'polling survives the terminal UI phase')
  callbacks.onSwapLifecycle({ step: 'retry_requested', swapId: 's1', stage: 'wallet_action', outcome: 'started', path: 'test' })
  callbacks.onSwapModalStateChange(true)
  await render({ localStatus: 'failed', showPanel: false })
  response = payload('completed', [input, output])
  for (let i = 0; i < 4; i++) await act(async () => { t.mock.timers.tick(500) })
  assert.deepEqual(events.map(e => e.type), ['completed'])
  await render({ localStatus: 'failed' })
  assert.equal(container.textContent, 'completed', 'backend input supersedes the local failure')
  const settled = requests
  await act(async () => { t.mock.timers.tick(30000) })
  assert.equal(requests, settled, 'settled backend completion stops polling')
})

test('gasless expiry still observes later backend expiry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  let response = payload('user_transfer_pending')
  globalThis.__swapTransport = async () => response
  const { render, events } = harness()
  await render({ gaslessFailureStatus: 'expired' })
  assert.equal(container.textContent, 'failed')
  response = payload('expired')
  for (let i = 0; i < 4; i++) await act(async () => { t.mock.timers.tick(500) })
  assert.equal(container.textContent, 'expired')
  assert.deepEqual(events.map(e => e.type), ['expired'])
})

test('reloading completed data is silent and settlement keeps polling for output and refuel', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  let response = payload('completed', [input], { refuel: { amount: 0.1 } })
  let requests = 0
  globalThis.__swapTransport = async () => { requests++; return response }
  const { render, events } = harness()
  await render()
  assert.equal(container.textContent, 'settling_output')
  response = payload('completed', [input, output], { refuel: { amount: 0.1 } })
  for (let i = 0; i < 3; i++) await act(async () => { t.mock.timers.tick(500) })
  assert.equal(container.textContent, 'settling_output')
  response = payload('completed', [input, output, refuel], { refuel: { amount: 0.1 } })
  for (let i = 0; i < 3; i++) await act(async () => { t.mock.timers.tick(500) })
  assert.equal(container.textContent, 'completed')
  assert.deepEqual(events, [])
  const settled = requests
  await act(async () => { t.mock.timers.tick(30000) })
  assert.equal(requests, settled)
})

test('polling termination depends on backend completion plus settlement, including early UI completion', () => {
  const interval = (response, extra = {}) => resolveSwapPollingInterval({ swap: response.data.swap,
    refuelRequired: !!response.data.refuel, now: 10000, lastChangeAt: 10000, ...extra })
  for (const localFailure of ['failed', 'expired', undefined]) {
    assert.ok(interval(payload('user_transfer_pending'), { phase: localFailure, gaslessFailureStatus: localFailure }) > 0)
    assert.ok(interval(payload('ls_transfer_pending', [input, output])) > 0)
    assert.ok(interval(payload('pending_refund', [input])) > 0)
    assert.ok(interval(payload('completed', [input])) > 0)
    assert.ok(interval(payload('completed', [input, output], { refuel: {} })) > 0)
    assert.equal(interval(payload('completed', [input, output, refuel], { refuel: {} })), 0)
    for (const status of ['failed', 'expired', 'refunded']) assert.equal(interval(payload(status)), 0)
  }
})

test('switching swap IDs isolates a late response and preserves the new swap baseline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  let resolveOld
  let next = payload('user_transfer_pending', [input])
  next.data.swap.id = 's2'
  globalThis.__swapTransport = key => key.includes('/s1?')
    ? new Promise(resolve => { resolveOld = resolve }) : Promise.resolve(next)
  const { render, events } = harness()
  await render({ id: 's1' })
  await render({ id: 's2' })
  await act(async () => { resolveOld(payload('completed', [input, output])) })
  assert.deepEqual(events, [], 'the old request cannot manufacture a transition for the new swap')
  next = payload('completed', [input, output]); next.data.swap.id = 's2'
  for (let i = 0; i < 4; i++) await act(async () => { t.mock.timers.tick(500) })
  assert.deepEqual(events.map(({ swapId, type }) => [swapId, type]), [['s2', 'completed']])
})
