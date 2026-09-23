import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode, useMemo } from 'react'
import {
  createLegacySwapEventRecorder, legacyAttributesFromLifecycle, legacyAttributesFromStatus,
  legacyEventFromLifecycle, legacyEventFromStatus,
} from '../../../../apps/bridge/lib/faro-legacy-swap-events.ts'

// Two host streams from one Processing render: onSwapStatusChange is the API
// status stream (identity: swapId + type), onSwapLifecycle carries the UI phase.
// The harness computes the phase the way SwapDataProvider does and calls the
// same two hooks Processing calls, so the matrix pins what a host receives per
// API status walk rather than a mirror of the effect.

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globals = {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
}
const previousGlobals = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    // The resolver only reads the API status enums; keep the HTTP client (and its
    // browser-only dependency graph) out of this test.
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) {
      return {
        url: 'data:text/javascript,'
          + 'export const BackendTransactionStatus = { Completed: "completed", Failed: "failed", Initiated: "initiated", Pending: "pending" };'
          + 'export const TransactionStatus = { Completed: "completed", Failed: "failed", Pending: "pending" };'
          + 'export const TransactionType = { Input: "input", Output: "output", Refuel: "refuel", Refund: "refund" };',
        shortCircuit: true,
      }
    }
    // The widget emits extensionless relative imports for bundlers; resolve those in Node.
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})

// Import after installing the DOM so the provider uses its client layout effect.
const { createRoot } = await import('react-dom/client')
const { CallbackProvider, useCallbacks } = await import('../dist/esm/context/callbackProvider.js')
const { useLifecycleObservation } = await import('../dist/esm/hooks/useLifecycleObservation.js')
const { useSwapStatusNotification, REPORTED_SWAP_STATUSES } = await import('../dist/esm/hooks/useSwapStatusNotification.js')
const { resolveSwapPhase } = await import('../dist/esm/components/utils/resolveSwapPhase.js')
const { PHASE_LIFECYCLE_EVENTS, lifecycleContextFromSwap } = await import('../dist/esm/lib/swapLifecycle.js')

let root
let container
beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
})
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of Object.keys(globals)) {
    if (previousGlobals[key]) Object.defineProperty(globalThis, key, previousGlobals[key])
    else delete globalThis[key]
  }
})

const basic = {
  destination_address: '0xdest', requested_amount: 1, use_deposit_address: false,
  source_network: { name: 'A' }, destination_network: { name: 'B' },
  source_token: { symbol: 'X' }, destination_token: { symbol: 'Y' },
}
const inputTx = (overrides = {}) => ({
  type: 'input', status: 'completed', transaction_hash: '0xin', confirmations: 1, max_confirmations: 1, from: '0xwallet', ...overrides,
})
const outputTx = { type: 'output', status: 'completed', transaction_hash: '0xout', amount: 1 }
const refuelTx = { type: 'refuel', status: 'completed', transaction_hash: '0xref', amount: 0.1 }
const refuel = { amount: 0.1, token: { symbol: 'Y', precision: 6 } }
const swap = (id, status, transactions = [], extra = {}) => ({ id, status, transactions, ...extra })

/** What Processing renders: the resolved phase on the lifecycle stream and the API status on the status stream. */
function ProcessingObservations({ swapDetails, refuel, storedWalletTransaction }) {
  const { phase, failureReason } = resolveSwapPhase({ swapDetails, refuel, storedWalletTransaction })
  const lifecycleContext = useMemo(() => lifecycleContextFromSwap(basic, swapDetails), [swapDetails])
  const swapInputTransaction = swapDetails.transactions?.find(t => t.type === 'input')
  useLifecycleObservation({
    ...PHASE_LIFECYCLE_EVENTS[phase],
    path: 'Processing',
    status: swapDetails.status,
    phase,
    reasonCode: swapDetails.fail_reason || failureReason,
  }, lifecycleContext)
  useSwapStatusNotification(swapDetails.id, swapDetails.status, {
    path: 'Processing',
    fromAddress: swapDetails.source_address ?? swapInputTransaction?.from,
    toAddress: basic.destination_address,
    sourceNetwork: basic.source_network.name,
    destinationNetwork: basic.destination_network.name,
    sourceToken: basic.source_token.symbol,
    destinationToken: basic.destination_token.symbol,
  })
  return null
}

let captured
function Capture() { captured = useCallbacks(); return null }

/** A host that records both streams, plus the bridge's legacy Faro derivation fed by both of them. */
function host() {
  const state = { statuses: [], lifecycle: [], captures: [], order: [] }
  const recorder = createLegacySwapEventRecorder({
    captureEvent: name => { state.captures.push(name); state.order.push(`capture:${name}`); return true },
    setLegacyContext: () => {},
  })
  const callbacks = {
    onSwapStatusChange: event => {
      state.statuses.push(event)
      state.order.push(`status:${event.swapId}:${event.type}`)
      const name = legacyEventFromStatus(event)
      if (name) recorder.record(name, legacyAttributesFromStatus(event))
    },
    onSwapLifecycle: event => {
      state.lifecycle.push(event)
      state.order.push(`lifecycle:${event.step}`)
      const name = legacyEventFromLifecycle(event)
      if (name) recorder.record(name, legacyAttributesFromLifecycle(event))
    },
  }
  // The provider stays mounted across renders; `null` unmounts only the Processing observer.
  const render = props => act(() => root.render(createElement(StrictMode, null,
    createElement(CallbackProvider, { callbacks },
      createElement(Capture),
      props ? createElement(ProcessingObservations, props) : null),
  )))
  const statusIds = () => state.statuses.map(({ swapId, type }) => [swapId, type])
  const phaseSteps = () => state.lifecycle.map(event => event.step)
  return { state, render, statusIds, phaseSteps }
}

const walk = (id = 's1', { withRefuel = false } = {}) => {
  const steps = [
    ['no input tx', swap(id, 'user_transfer_pending')],
    ['input tx pending', swap(id, 'user_transfer_pending', [inputTx({ status: 'pending', confirmations: 0 })])],
    ['input confirmed, API moved on', swap(id, 'ls_transfer_pending', [inputTx()])],
    ['address enrichment', swap(id, 'ls_transfer_pending', [inputTx()], { source_address: '0xfrom' })],
    ['output tx', swap(id, 'ls_transfer_pending', [inputTx(), outputTx], { source_address: '0xfrom' })],
  ]
  if (withRefuel) steps.push(['refuel tx', swap(id, 'ls_transfer_pending', [inputTx(), outputTx, refuelTx], { source_address: '0xfrom' })])
  const completed = swap(id, 'completed', [inputTx(), outputTx, ...(withRefuel ? [refuelTx] : [])], { source_address: '0xfrom' })
  steps.push(['API completed', completed], ['completed replay', { ...completed }])
  return steps
}

for (const withRefuel of [false, true]) {
  test(`(${withRefuel ? 'b' : 'a'}) a ${withRefuel ? 'refuel' : 'no-refuel'} walk reports each API status once and every phase once on the lifecycle stream`, async () => {
    const screen = host()
    for (const [, details] of walk('s1', { withRefuel })) await screen.render({ swapDetails: details, refuel: withRefuel ? refuel : undefined })

    assert.deepEqual(screen.statusIds(), [['s1', 'ls_transfer_pending'], ['s1', 'completed']])
    assert.deepEqual(screen.phaseSteps(), [
      'awaiting_user_deposit', 'input_transfer_pending', 'output_transfer_pending',
      ...(withRefuel ? ['output_settling'] : []),
      // Pinned as-is (follow-up): the API status is part of the phase fingerprint, so the
      // completion resolved from the output tx is reported again once the API confirms it.
      'swap_completed', 'swap_completed',
    ])
    assert.deepEqual(screen.state.lifecycle.filter(e => e.step === 'swap_completed').map(e => e.status), ['ls_transfer_pending', 'completed'])

    // (j) UI phase never leaks onto the status stream.
    assert.ok(screen.state.statuses.every(event => !('phase' in event)))
    // (k) Context is a snapshot: enrichment that arrived between transitions rides the next one.
    assert.equal(screen.state.statuses[0].fromAddress, '0xwallet')
    assert.equal(screen.state.statuses[1].fromAddress, '0xfrom')
    assert.deepEqual(screen.state.statuses[1], {
      swapId: 's1', type: 'completed', path: 'Processing', fromAddress: '0xfrom', toAddress: '0xdest',
      sourceNetwork: 'A', destinationNetwork: 'B', sourceToken: 'X', destinationToken: 'Y',
    })

    // Bridge end-to-end: both streams feed the legacy events, each captured once, and the
    // early UI completion still produces swap_completed before the API status confirms it.
    assert.deepEqual(screen.state.captures, ['swap_pending', 'swap_completed'])
    assert.ok(screen.state.order.indexOf('capture:swap_completed') < screen.state.order.indexOf('status:s1:completed'))
    assert.ok(screen.state.order.indexOf('capture:swap_completed') > screen.state.order.indexOf('status:s1:ls_transfer_pending'))
  })
}

test('(c)(d)(e) re-render, remount and retry: only a new attempt repeats a delivered status', async () => {
  const screen = host()
  const steps = walk()
  for (const [, details] of steps) await screen.render({ swapDetails: details })
  const [, completed] = steps.at(-1)
  const delivered = { statuses: screen.state.statuses.length, lifecycle: screen.state.lifecycle.length }

  // (c) same props again
  await screen.render({ swapDetails: completed })
  await screen.render({ swapDetails: completed })
  assert.equal(screen.state.statuses.length, delivered.statuses)
  assert.equal(screen.state.lifecycle.length, delivered.lifecycle)

  // (d) unmount/remount without a modal reset
  await screen.render(null)
  await screen.render({ swapDetails: completed })
  assert.equal(screen.state.statuses.length, delivered.statuses, 'a remount is not a transition')
  assert.equal(screen.state.lifecycle.length, delivered.lifecycle)

  // (e) a new attempt for the swap permits the same status again
  await screen.render(null)
  act(() => captured.onSwapLifecycle({ step: 'retry_requested', stage: 'wallet_action', outcome: 'started', path: 'SwapDetails', swapId: 's1' }))
  await screen.render({ swapDetails: completed })
  assert.deepEqual(screen.statusIds().slice(delivered.statuses), [['s1', 'completed']])
  assert.deepEqual(screen.phaseSteps().slice(delivered.lifecycle + 1), ['swap_completed'])
  assert.deepEqual(screen.state.captures, ['swap_pending', 'swap_completed'], 'the bridge dedupe is per name and swap, not per attempt')
})

test('(f) a second swap gets its own deliveries and a late update of the first one is not one', async () => {
  const screen = host()
  const steps = walk()
  for (const [, details] of steps) await screen.render({ swapDetails: details })
  const [, completed] = steps.at(-1)

  await screen.render({ swapDetails: swap('s2', 'ls_transfer_pending', [inputTx()]) })
  assert.deepEqual(screen.statusIds(), [['s1', 'ls_transfer_pending'], ['s1', 'completed'], ['s2', 'ls_transfer_pending']])
  assert.equal(screen.phaseSteps().at(-1), 'output_transfer_pending')
  assert.equal(screen.state.lifecycle.at(-1).swapId, 's2')

  await screen.render({ swapDetails: { ...completed, source_address: '0xlate' } })
  assert.deepEqual(screen.statusIds().slice(3), [])
  assert.deepEqual(screen.state.captures, ['swap_pending', 'swap_completed', 'swap_pending'])
})

test('(g) an input transaction failure is a lifecycle observation, not an API status', async () => {
  const screen = host()
  const failed = swap('s1', 'user_transfer_pending', [inputTx({ status: 'failed' })])
  await screen.render({ swapDetails: swap('s1', 'user_transfer_pending', [inputTx({ status: 'pending', confirmations: 0 })]) })
  await screen.render({ swapDetails: failed })
  await screen.render({ swapDetails: { ...failed } })
  assert.deepEqual(screen.statusIds(), [])
  assert.deepEqual(screen.phaseSteps(), ['input_transfer_pending', 'swap_failed'])
  assert.deepEqual(screen.state.captures, ['swap_failed'])
})

test('(h) an expired swap is reported once on both streams', async () => {
  const screen = host()
  const expired = swap('s1', 'expired', [inputTx()])
  await screen.render({ swapDetails: expired })
  await screen.render({ swapDetails: { ...expired } })
  assert.deepEqual(screen.statusIds(), [['s1', 'expired']])
  assert.deepEqual(screen.phaseSteps(), ['swap_expired'])
  assert.deepEqual(screen.state.captures, ['swap_failed'])
})

test('(i) created and user_transfer_pending never reach the status stream', async () => {
  const screen = host()
  await screen.render({ swapDetails: swap('s1', 'created') })
  await screen.render({ swapDetails: swap('s1', 'user_transfer_pending') })
  await screen.render({ swapDetails: swap('s1', 'user_transfer_pending', [inputTx({ status: 'pending', confirmations: 0 })]) })
  assert.deepEqual(screen.statusIds(), [])
  // The API status is part of the phase fingerprint (pinned as-is, see (a)), so created -> user_transfer_pending
  // re-reports the unchanged awaiting phase on the lifecycle stream while the status stream stays silent.
  assert.deepEqual(screen.phaseSteps(), ['awaiting_user_deposit', 'awaiting_user_deposit', 'input_transfer_pending'])
  assert.deepEqual(screen.state.lifecycle.map(event => event.status), ['created', 'user_transfer_pending', 'user_transfer_pending'])
  assert.deepEqual([...REPORTED_SWAP_STATUSES].sort(), ['completed', 'expired', 'failed', 'ls_transfer_pending'])
})
