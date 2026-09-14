import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, useEffect, useState } from 'react'
import { setErrorLogger } from '@layerswap/widget-types'

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
