import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode, useEffect, useState } from 'react'
import { ErrorHandler, getErrorOccurrenceId, setErrorLogger } from '@layerswap/widget-types'
import { createSwapLifecycleTelemetry } from '../../../../apps/bridge/lib/faro-swap-lifecycle.ts'

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

// The widget emits extensionless relative imports for bundlers; resolve those in Node.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})

// Import after installing the DOM so the provider uses its client layout effect.
const { createRoot } = await import('react-dom/client')
const { CallbackProvider, useCallbacks } = await import('../dist/esm/context/callbackProvider.js')
const { registerWidgetErrorLogger } = await import('../dist/esm/lib/ErrorHandler.js')
const { widgetTelemetry } = await import('../dist/esm/lib/widgetTelemetry.js')
const { logStore } = await import('../dist/esm/stores/logStore.js')
const { useTransferBlocked } = await import('../dist/esm/hooks/useTransferBlocked.js')

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
  registerWidgetErrorLogger()
})
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of Object.keys(globals)) {
    if (previousGlobals[key]) Object.defineProperty(globalThis, key, previousGlobals[key])
    else delete globalThis[key]
  }
})

function SwapEvents({ status }) {
  const { onSwapStatusChange, onSwapLifecycle } = useCallbacks()
  useEffect(() => {
    onSwapStatusChange({ type: status, swapId: 'swap-123' })
  }, [status, onSwapStatusChange])
  useEffect(() => {
    onSwapLifecycle({
      step: status === 'completed' ? 'swap_completed' : 'output_transfer_pending',
      stage: 'swap',
      outcome: status === 'completed' ? 'succeeded' : 'pending',
      path: 'test',
      swapId: 'swap-123',
    })
  }, [status, onSwapLifecycle])
  return null
}

test('the widget attaches classification to the error occurrence before calling the host', t => {
  const received = []
  registerWidgetErrorLogger()
  t.after(logStore.getState().registerLogger(event => received.push(event)))
  const cause = Object.assign(new Error('Request declined'), { code: 'ACTION_REJECTED' })
  ErrorHandler({ type: 'SwapWithdrawalError', message: 'Withdrawal failed', cause, swapId: 'swap-a' })
  ErrorHandler({ type: 'WalletError', message: 'Account unavailable', cause: { code: 4100 } })
  assert.equal(received[0].reasonCode, 'user_rejected')
  assert.equal(received[0].occurrenceId, getErrorOccurrenceId(cause))
  assert.equal(received[0].cause, cause)
  assert.equal(received[0].swapId, 'swap-a')
  assert.equal(received[1].reasonCode, 'unauthorized')
})

test('error enrichment leaves background diagnostics and unknown wallet reasons unset', t => {
  const received = []
  registerWidgetErrorLogger()
  t.after(logStore.getState().registerLogger(event => received.push(event)))
  const events = [
    { type: 'APIError', message: 'Backend unavailable' },
    { type: 'APIError', message: 'Not enough liquidity for route' },
    { type: 'APIError', message: 'Upstream timeout' },
    { type: 'BalanceProviderError', message: 'Network error' },
    { type: 'GasProviderError', message: 'Cannot estimate gas' },
    { type: 'WalletError', message: 'Unexpected provider failure', cause: { code: -1 } },
  ]
  for (const event of events) ErrorHandler(event)
  assert.equal(received.length, events.length)
  for (const [i, event] of received.entries()) {
    assert.equal(Object.hasOwn(event, 'reasonCode'), false)
    assert.equal(event.type, events[i].type)
    assert.equal(event.message, events[i].message)
    assert.equal(event.cause, events[i].cause)
    assert.ok(event.occurrenceId)
  }
})

test('error enrichment preserves explicit reasons instead of reclassifying message text', t => {
  const received = []
  registerWidgetErrorLogger()
  t.after(logStore.getState().registerLogger(event => received.push(event)))
  ErrorHandler({ type: 'WalletError', message: 'User rejected', reasonCode: 'unauthorized' })
  ErrorHandler({ type: 'APIError', message: 'Request failed', reasonCode: 'timeout' })
  assert.deepEqual(received.map(event => event.reasonCode), ['unauthorized', 'timeout'])
})

test('inline callbacks that store events in host state settle without repeated emissions', async () => {
  let renders = 0
  const statuses = []
  const lifecycle = []
  function Host({ status }) {
    const [latestStatus, setLatestStatus] = useState()
    const [latestLifecycle, setLatestLifecycle] = useState()
    // Bound a regression so the test fails instead of hanging in an update loop.
    if (++renders > 20) throw new Error('Host exceeded its render budget')
    return createElement(CallbackProvider, {
      callbacks: {
        onSwapStatusChange: event => { statuses.push(event); setLatestStatus(event) },
        onSwapLifecycle: event => { lifecycle.push(event); setLatestLifecycle(event) },
      },
    }, createElement(SwapEvents, { status }),
    createElement('output', null, `${latestStatus?.type}:${latestLifecycle?.step}`))
  }

  await act(() => root.render(createElement(Host, { status: 'ls_transfer_pending' })))
  await act(() => root.render(createElement(Host, { status: 'ls_transfer_pending' })))
  assert.equal(statuses.length, 1)
  assert.equal(lifecycle.length, 1)
  assert.equal(container.textContent, 'ls_transfer_pending:output_transfer_pending')

  await act(() => root.render(createElement(Host, { status: 'completed' })))
  assert.deepEqual(statuses.map(event => event.type), ['ls_transfer_pending', 'completed'])
  assert.deepEqual(lifecycle.map(event => event.step), ['output_transfer_pending', 'swap_completed'])
  assert.equal(container.textContent, 'completed:swap_completed')
})

test('replacement handlers receive the next transition without replaying unchanged state', async () => {
  const first = []
  const second = []
  const callbacks = events => ({
    onSwapStatusChange: event => events.push(event.type),
    onSwapLifecycle: event => events.push(event.step),
  })
  const render = (status, handlers) => act(() => root.render(
    createElement(CallbackProvider, { callbacks: handlers }, createElement(SwapEvents, { status })),
  ))

  await render('ls_transfer_pending', callbacks(first))
  await render('ls_transfer_pending', callbacks(second))
  assert.deepEqual(first, ['ls_transfer_pending', 'output_transfer_pending'])
  assert.deepEqual(second, [])

  // Replace the functions again in the same commit as the real transition.
  await render('completed', callbacks(second))
  assert.deepEqual(first, ['ls_transfer_pending', 'output_transfer_pending'])
  assert.deepEqual(second, ['completed', 'swap_completed'])

  await render('ls_transfer_pending', undefined)
  assert.deepEqual(second, ['completed', 'swap_completed'])
})

test('throwing host callbacks retain their error details and lifecycle telemetry still runs', async t => {
  const error = new TypeError('Host callback failed', { cause: new Error('Inner failure') })
  const received = []
  setErrorLogger(event => received.push(event))
  const telemetry = t.mock.method(widgetTelemetry, 'lifecycle')
  const fail = () => { throw error }

  await act(() => root.render(createElement(CallbackProvider, {
    callbacks: { onSwapStatusChange: fail, onSwapLifecycle: fail },
  }, createElement(SwapEvents, { status: 'completed' }))))

  assert.equal(received.length, 2)
  for (const event of received) {
    assert.equal(event.type, 'CallbackError')
    assert.equal(event.name, error.name)
    assert.equal(event.message, error.message)
    assert.equal(event.stack, error.stack)
    assert.equal(event.cause, error)
    assert.ok(event.occurrenceId)
  }
  assert.equal(received[0].occurrenceId, received[1].occurrenceId)
  assert.equal(telemetry.mock.callCount(), 1)
  assert.equal(telemetry.mock.calls[0].arguments[0].step, 'swap_completed')
})

test('all host callback boundaries normalize nullish and primitive failures without interrupting execution', async t => {
  const received = []
  registerWidgetErrorLogger()
  t.after(logStore.getState().registerLogger(event => received.push(event)))
  let current
  function CaptureCallbacks() {
    current = useCallbacks()
    return null
  }
  const args = {
    onFormChange: { amount: '1' },
    onSwapCreate: { swap: { id: 'swap-123' } },
    onSwapComplete: { swap: { id: 'swap-123' } },
    onSwapModalStateChange: true,
    onBackClick: undefined,
    onSwapStatusChange: { type: 'completed', swapId: 'swap-123' },
    onSwapLifecycle: { step: 'wallet_prompt_opened', stage: 'wallet_action', outcome: 'pending', path: 'test' },
    onMenuNavigationChange: 'swap',
  }
  for (const caught of [null, undefined, 'host failure', 42, new TypeError('native host failure')]) {
    const callbacks = Object.fromEntries(Object.keys(args).map(name => [name, () => { throw caught }]))
    await act(() => root.render(createElement(CallbackProvider, { callbacks }, createElement(CaptureCallbacks))))
    for (const [name, arg] of Object.entries(args)) {
      const before = received.length
      assert.doesNotThrow(() => current[name](arg), name)
      assert.equal(received.length, before + 1, name)
      const event = received.at(-1)
      assert.equal(event.type, 'CallbackError')
      assert.equal(event.message, caught instanceof Error ? caught.message : String(caught))
      assert.equal(event.name, caught instanceof Error ? caught.name : 'Error')
      assert.equal(event.cause, caught)
      assert.ok(event.occurrenceId)
      if (caught instanceof Error) assert.equal(event.stack, caught.stack)
    }
  }
})

function BlockedWallet({ reasonCode = 'rpc_unhealthy', reason = 'RPC probe failed' }) {
  useTransferBlocked(reasonCode, { swapId: 'swap-blocked' }, 'TransferTokenButton', reason)
  return null
}

for (const strict of [false, true]) {
  test(`initial transfer block owns lifecycle context and stall timer${strict ? ' under StrictMode' : ''}`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
    const records = []
    let context
    const controller = createSwapLifecycleTelemetry({
      setSwapContext: attributes => { context = attributes; return true },
      captureEvent: (name, attributes) => { records.push(attributes); return true },
    })
    t.after(() => controller.dispose())
    function WithdrawPhase() {
      const { onSwapLifecycle } = useCallbacks()
      useEffect(() => {
        onSwapLifecycle({ step: 'awaiting_wallet_action', stage: 'wallet_action', outcome: 'pending',
          path: 'Withdraw', swapId: 'swap-blocked' })
      }, [onSwapLifecycle])
      return createElement(BlockedWallet)
    }
    const child = createElement(CallbackProvider, { callbacks: { onSwapLifecycle: controller.record } }, createElement(WithdrawPhase))
    await act(() => root.render(strict ? createElement(StrictMode, null, child) : child))
    assert.deepEqual(records.map(event => event.step), ['awaiting_wallet_action', 'transfer_blocked'])
    assert.equal(context.step, 'transfer_blocked')
    assert.equal(context.reason_code, 'rpc_unhealthy')
    assert.equal(context.reason, 'RPC probe failed')
    t.mock.timers.tick(10 * 60_000 + 1)
    assert.equal(records.at(-1).step, 'suspected_stall')
    assert.equal(records.at(-1).stalled_step, 'transfer_blocked')
    assert.equal(records.at(-1).reason_code, 'transfer_blocked_timeout')
  })
}

test('blocked effects cancel stale/unmounted emissions and report again after recovery', async t => {
  const queued = []
  t.mock.method(globalThis, 'queueMicrotask', fn => queued.push(fn))
  const records = []
  const callbacks = { onSwapLifecycle: event => records.push(event) }
  const render = (reasonCode, reason) => act(() => root.render(createElement(CallbackProvider, { callbacks },
    createElement(BlockedWallet, { reasonCode, reason }))))
  const flush = () => act(() => { for (const emit of queued.splice(0)) emit() })

  await render('rpc_unhealthy')
  await render('insufficient_gas', 'old details')
  await render('insufficient_gas', 'latest details')
  await flush()
  assert.deepEqual(records.map(event => event.reasonCode), ['insufficient_gas'])
  assert.equal(records[0].reason, 'latest details')
  await render('insufficient_gas')
  await flush()
  assert.equal(records.length, 1)
  await render(null)
  await render('insufficient_gas')
  await flush()
  assert.equal(records.length, 2)
  await render('rpc_unhealthy')
  await act(() => root.render(null))
  await flush()
  assert.equal(records.length, 2, 'unmounted blocks must not change the journey')
})

test('StrictMode and confirmation updates deduplicate both telemetry and public lifecycle observations', async t => {
  const records = []
  const forwarded = []
  const callbacks = { onTelemetry: e => records.push(e), onSwapLifecycle: e => forwarded.push(e) }
  const unmountFlow = widgetTelemetry.mount(widgetTelemetry.createFlow({ form_mode: 'cross-chain' }))
  t.after(unmountFlow)
  const observation = (step, extra = {}) => ({ step, stage: 'swap', outcome: 'succeeded',
    path: 'Processing', swapId: 'swap-123', ...extra })

  function ProcessingObservations({ confirmations }) {
    const { onSwapLifecycle } = useCallbacks()
    // Independent effects reproduce Processing's interleaved mount replay.
    useEffect(() => {
      onSwapLifecycle(observation('input_transaction_detected', { transactionHash: 'input-a' }))
    }, [onSwapLifecycle])
    useEffect(() => {
      onSwapLifecycle(observation('input_transfer_confirmed', { transactionHash: 'input-a', confirmations }))
    }, [onSwapLifecycle, confirmations])
    useEffect(() => {
      onSwapLifecycle(observation('output_transaction_detected', { transactionHash: 'output-a', confirmations }))
    }, [onSwapLifecycle, confirmations])
    useEffect(() => {
      onSwapLifecycle(observation('swap_completed', { phase: 'completed' }))
    }, [onSwapLifecycle])
    return null
  }

  const render = confirmations => act(() => root.render(createElement(StrictMode, null,
    createElement(CallbackProvider, { callbacks }, confirmations === undefined ? null
      : createElement(ProcessingObservations, { confirmations })),
  )))
  await render()
  widgetTelemetry.lifecycle({ step: 'form_submitted', stage: 'form', outcome: 'started', path: 'test' })
  widgetTelemetry.lifecycle(observation('swap_created'))
  records.length = 0

  await render(10)
  assert.deepEqual(records.map(e => e.attributes.step), [
    'input_transaction_detected', 'input_transfer_confirmed', 'output_transaction_detected', 'swap_completed',
  ])
  assert.equal(forwarded.length, 4, 'public callbacks receive each milestone once')
  await render(11)
  assert.equal(records.length, 4, 'confirmation-only updates do not duplicate funnel milestones')
  assert.equal(forwarded.length, 4)
})

test('status callbacks deduplicate late context but retain API and UI phase transitions per swap', async () => {
  const events = []
  function Status({ event }) {
    const { onSwapStatusChange } = useCallbacks()
    useEffect(() => { onSwapStatusChange(event) }, [event, onSwapStatusChange])
    return null
  }
  const render = event => act(() => root.render(createElement(StrictMode, null,
    createElement(CallbackProvider, { callbacks: { onSwapStatusChange: e => events.push(e) } },
      createElement(Status, { event })),
  )))
  const pending = { swapId: 'swap-a', type: 'ls_transfer_pending', phase: 'output_pending' }
  await render(pending)
  await render({ ...pending, fromAddress: 'arrived-later' })
  await render({ ...pending, phase: 'completed' })
  await render({ ...pending, phase: 'completed', fromAddress: 'enriched' })
  await render({ ...pending, type: 'completed', phase: 'completed' })
  await render({ ...pending, swapId: 'swap-b', type: 'completed', phase: 'completed' })
  await render({ ...pending, type: 'completed', phase: 'completed', fromAddress: 'late-swap-a' })
  assert.deepEqual(events.map(({ swapId, type, phase }) => [swapId, type, phase]), [
    ['swap-a', 'ls_transfer_pending', 'output_pending'],
    ['swap-a', 'ls_transfer_pending', 'completed'],
    ['swap-a', 'completed', 'completed'],
    ['swap-b', 'completed', 'completed'],
  ])
})

test('a retried wallet failure reports status again even when the API status and UI phase are unchanged', async () => {
  const events = []
  let callbacks
  function Capture() { callbacks = useCallbacks(); return null }
  await act(() => root.render(createElement(CallbackProvider, {
    callbacks: { onSwapStatusChange: e => events.push(e) },
  }, createElement(Capture))))
  const failed = { swapId: 'swap-a', type: 'user_transfer_pending', phase: 'failed' }
  const other = { ...failed, swapId: 'swap-b' }
  callbacks.onSwapStatusChange(failed)
  callbacks.onSwapStatusChange(other)
  callbacks.onSwapStatusChange({ ...failed, fromAddress: 'late' })
  for (const step of ['retry_requested', 'awaiting_wallet_action', 'wallet_prompt_opened']) {
    callbacks.onSwapLifecycle({ step, swapId: 'swap-a', stage: 'wallet_action', outcome: 'pending', path: 'test' })
  }
  callbacks.onSwapStatusChange(failed)
  callbacks.onSwapStatusChange(other)
  callbacks.onSwapStatusChange(failed)
  assert.deepEqual(events, [failed, other, failed], 'retry resets only its own swap status')
})

test('lifecycle observations preserve recovery, attempts, new transactions and separate swap identities', async () => {
  const events = []
  let callbacks
  function Capture() { callbacks = useCallbacks(); return null }
  await act(() => root.render(createElement(CallbackProvider, {
    callbacks: { onSwapLifecycle: e => events.push(e), onSwapStatusChange: e => events.push(e) },
  }, createElement(Capture))))
  const emit = (step, extra = {}) => callbacks.onSwapLifecycle({
    step, swapId: 'swap-a', stage: 'wallet_action', outcome: 'pending', path: 'test', ...extra,
  })
  emit('awaiting_wallet_action')
  emit('awaiting_wallet_action', { fromAddress: 'late' })
  emit('input_transfer_pending')
  emit('awaiting_wallet_action')
  assert.equal(events.length, 3, 'A → B → A is a recovery')
  emit('input_transfer_confirmed', { transactionHash: 'tx-a', confirmations: 10 })
  emit('awaiting_wallet_action')
  emit('input_transfer_confirmed', { transactionHash: 'tx-a', confirmations: 11 })
  assert.equal(events.length, 4, 'interleaved effects do not reset transaction slots')
  emit('input_transfer_confirmed', { transactionHash: 'tx-b' })
  emit('input_transfer_confirmed', { transactionHash: 'tx-a', swapId: 'swap-b' })
  emit('input_transfer_confirmed', { transactionHash: 'tx-b', fromAddress: 'late' })
  assert.equal(events.length, 6)
  for (let attempt = 0; attempt < 2; attempt++) {
    emit('wallet_prompt_opened')
    emit('wallet_action_rejected', { occurrenceId: 'same-provider-error-object' })
    emit('awaiting_wallet_action')
  }
  assert.equal(events.length, 12, 'each wallet prompt and retry remains observable')
  emit('transfer_blocked', { reasonCode: 'rpc_unhealthy' })
  emit('transfer_blocked', { reasonCode: 'rpc_unhealthy' })
  assert.equal(events.length, 14, 'the block hook already deduplicates reason transitions')
  const completed = { type: 'completed', phase: 'completed', swapId: 'swap-a' }
  callbacks.onSwapStatusChange(completed)
  callbacks.onSwapStatusChange(completed)
  assert.equal(events.length, 15)
  callbacks.onSwapModalStateChange(true)
  emit('awaiting_wallet_action')
  callbacks.onSwapStatusChange(completed)
  assert.equal(events.length, 17, 'reopening starts a fresh observation scope')
  emit('form_submitted', { swapId: undefined })
  emit('awaiting_wallet_action')
  callbacks.onSwapStatusChange(completed)
  assert.equal(events.length, 20, 'a new form submission resets previous swap observations')
})
