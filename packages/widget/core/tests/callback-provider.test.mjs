import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode, useEffect, useState } from 'react'
import { ErrorHandler, getErrorOccurrenceId, setErrorLogger } from '@layerswap/widget-types'

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
    assert.equal(event.name, error.name)
    assert.equal(event.message, error.message)
    assert.equal(event.stack, error.stack)
    assert.equal(event.cause, error.cause)
    assert.ok(event.occurrenceId)
  }
  assert.equal(received[0].occurrenceId, received[1].occurrenceId)
  assert.equal(telemetry.mock.callCount(), 1)
  assert.equal(telemetry.mock.calls[0].arguments[0].step, 'swap_completed')
})

test('StrictMode deduplicates widget flow observations while preserving public lifecycle callbacks', async t => {
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
  assert.equal(forwarded.length, 8, 'public callbacks still receive each effect observation')
  await render(11)
  assert.equal(records.length, 4, 'confirmation-only updates do not duplicate funnel milestones')
  assert.equal(forwarded.length, 10)
})
