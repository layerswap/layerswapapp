import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode, useState } from 'react'
import { useFormikContext } from 'formik'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globals = {
  window: dom.window,
  document: dom.window.document,
  Element: dom.window.Element,
  IS_REACT_ACT_ENVIRONMENT: true,
}
const previousGlobals = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

const fundingUrl = `data:text/javascript,${encodeURIComponent(`
  export const state = { accounts: [], balances: {} };
  export const useSwapAccounts = () => state.accounts;
  export const selectedSourceAccountForNetwork = (accounts, network) => accounts.find(a => a.provider.withdrawalSupportedNetworks.includes(network));
  export const getKey = (address, network) => address + ':' + network.name;
  export const useBalanceStore = { getState: () => state };
`)}`

// The widget emits extensionless relative imports for bundlers; resolve those in Node.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/context/swapAccounts') || specifier.endsWith('/stores/balanceStore')) return { url: fundingUrl, shortCircuit: true }
    if (specifier === './AmountPresetController') return { url: 'data:text/javascript,export default () => null', shortCircuit: true }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})

// Import after installing the DOM so the provider uses its client layout effect.
const { state: funding } = await import(fundingUrl)
const { createRoot } = await import('react-dom/client')
const { CallbackProvider, useCallbacks } = await import('../dist/esm/context/callbackProvider.js')
const { captureWidgetInteraction } = await import('../dist/esm/lib/widgetTelemetry.js')
const { default: SwapForm } = await import('../dist/esm/components/Pages/Swap/Form/SwapForm.js')

const MODES = ['cross-chain', 'exchange', 'deposit-address', 'deposit-widget-address', 'deposit-widget-wallet']

let root
let container
beforeEach(() => {
  funding.accounts = []; funding.balances = {}
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

/** Exposes Formik's submitForm and the provider's onSwapLifecycle to the test. */
function Probe({ handle }) {
  const { submitForm, setValues } = useFormikContext()
  handle.setValues = setValues
  const { onSwapLifecycle } = useCallbacks()
  handle.submitForm = submitForm
  handle.onSwapLifecycle = onSwapLifecycle
  return createElement('input', { 'data-testid': 'amount' })
}

/** The form can be unmounted while the provider (and its telemetry registration) stays. */
function Host({ handle, callbacks, form }) {
  const [showForm, setShowForm] = useState(true)
  handle.setShowForm = setShowForm
  return createElement(CallbackProvider, { callbacks }, showForm ? form : null)
}

async function mount({ mode, onSubmit = async () => {}, submitAction = 'continue' }) {
  const telemetry = []
  const lifecycle = []
  const handle = {}
  const form = createElement(
    SwapForm,
    { mode, submitPath: 't', submitAction, initialValues: { from: { name: 'A' }, to: { name: 'B' } }, onSubmit },
    createElement(Probe, { handle }),
  )
  await act(async () => {
    root.render(createElement(StrictMode, null, createElement(Host, {
      handle,
      form,
      callbacks: { onTelemetry: e => telemetry.push(e), onSwapLifecycle: e => lifecycle.push(e) },
    })))
  })
  // form_viewed is deferred a microtask past the StrictMode layout-effect replay.
  await act(async () => { await Promise.resolve() })
  const flow = step => telemetry.filter(e => e.name === 'widget_flow' && e.attributes.step === step)
  const interactions = action => telemetry.filter(e => e.name === 'widget_interaction' && e.attributes.action === action)
  return { telemetry, lifecycle, handle, flow, interactions }
}

for (const mode of MODES) {
  test(`SwapForm mode="${mode}" opens exactly one widget_flow journey with the form context`, async () => {
    const { flow, telemetry } = await mount({ mode })
    assert.equal(telemetry.filter(e => e.name === 'widget_flow').length, 1)
    const [viewed] = flow('form_viewed')
    assert.equal(viewed.attributes.form_mode, mode)
    assert.equal(viewed.attributes.source_network, 'A')
    assert.equal(viewed.attributes.destination_network, 'B')
    assert.equal(viewed.attributes.submitted, false)
  })
}

test('SwapForm owns the [data-ls-form] boundary: editing starts the form once, not per keystroke', async () => {
  const { flow, interactions, handle } = await mount({ mode: 'deposit-widget-wallet' })
  const input = container.querySelector('[data-testid="amount"]')
  assert.equal(input.closest('[data-ls-form]')?.getAttribute('data-ls-form'), 'deposit-widget-wallet')
  // LayerswapProvider forwards every captured change event here; jsdom cannot dispatch trusted events.
  for (let i = 0; i < 20; i++) captureWidgetInteraction({ target: input, type: 'change' })
  assert.equal(flow('form_started').length, 1)
  assert.equal(interactions('form_edited').length, 1)
  assert.equal(interactions('form_edited')[0].attributes.form_mode, 'deposit-widget-wallet')
  assert.ok(handle.submitForm)
})

test('one Formik submission reports form_submitted to the host and starts the telemetry journey', async () => {
  const submissions = []
  const { flow, lifecycle, handle } = await mount({ mode: 'deposit-widget-wallet', onSubmit: values => { submissions.push(values) } })
  await act(async () => { await handle.submitForm() })
  assert.equal(submissions.length, 1)
  assert.equal(submissions[0].from.name, 'A')
  const submitted = lifecycle.filter(e => e.step === 'form_submitted')
  assert.equal(submitted.length, 1)
  assert.equal(submitted[0].path, 't')
  assert.equal(submitted[0].action, 'continue')
  assert.equal(submitted[0].stage, 'form')
  assert.equal(submitted[0].outcome, 'started')
  assert.equal(submitted[0].sourceNetwork, 'A')
  assert.equal(submitted[0].destinationNetwork, 'B')
  assert.equal(flow('form_submitted').length, 1)
  assert.equal(flow('form_submitted')[0].attributes.submitted, true)
  assert.equal(flow('form_submitted')[0].attributes.submission_count, 1)

  await act(async () => {
    handle.onSwapLifecycle({ step: 'swap_created', swapId: 's1', stage: 'swap_creation', outcome: 'succeeded', path: 'x' })
  })
  assert.equal(flow('swap_created').length, 1)
  assert.equal(flow('swap_created')[0].attributes.swap_id, 's1')
  assert.equal(flow('swap_created')[0].attributes.form_mode, 'deposit-widget-wallet')

  // Unmounting the form ends the journey while the provider stays registered.
  const before = flow('swap_completed').length
  await act(async () => { handle.setShowForm(false) })
  assert.equal(container.querySelector('[data-ls-form]'), null)
  const { onSwapLifecycle } = handle
  await act(async () => {
    onSwapLifecycle({ step: 'swap_completed', swapId: 's1', stage: 'swap', outcome: 'succeeded', path: 'x' })
  })
  assert.equal(flow('swap_completed').length, before)
  assert.equal(lifecycle.filter(e => e.step === 'swap_completed').length, 1, 'the host callback is unaffected')
})

test('a synchronous onSubmit still resolves Formik submission', async () => {
  let calls = 0
  const { handle } = await mount({ mode: 'cross-chain', submitAction: 'submit', onSubmit: () => { calls++ } })
  await act(async () => { await handle.submitForm() })
  assert.equal(calls, 1)
})

test('submission reports the final mode and the exact source balance; manual edits do not inherit Max provenance', async () => {
  funding.accounts = [{ id: 'wallet-b', providerName: 'EVM', address: '0xb', provider: { withdrawalSupportedNetworks: ['A'] } }]
  funding.balances['0xb:A'] = { status: 'success', data: { balances: [
    { network: 'A', token: 'ETH', amount: 1, request_time: 'fresh-balance' },
    { network: 'A', token: 'USDC', amount: 99, request_time: 'other-token' },
  ] } }
  const { lifecycle, handle } = await mount({ mode: 'cross-chain' })
  const calculation = { amount: '9', walletId: 'wallet-a', walletAddress: '0xa', balance: 10, balanceToken: 'ETH', balanceTimestamp: 'old-balance' }
  const values = { from: { name: 'A' }, to: { name: 'B' }, fromAsset: { symbol: 'ETH' }, amount: '9',
    depositMethod: 'wallet', amountMode: 'max', amountCalculation: calculation }
  await act(() => handle.setValues(values))
  await act(async () => { await handle.submitForm() })
  const max = lifecycle.at(-1)
  assert.equal(max.amountMode, 'max')
  assert.equal(max.sourceWalletAddress, '0xb')
  assert.equal(max.walletBalance, 1)
  assert.equal(max.walletBalanceToken, 'ETH')
  assert.equal(max.walletBalanceTimestamp, 'fresh-balance')
  assert.equal(max.amountCalculation.walletAddress, '0xa')
  assert.equal(max.amountCalculation.balance, 10)
  await act(() => handle.setValues({ ...values, amount: '0.5', amountMode: 'manual' }))
  await act(async () => { await handle.submitForm() })
  assert.equal(lifecycle.at(-1).amountMode, 'manual')
  assert.equal(lifecycle.at(-1).amountCalculation, undefined)
  assert.equal(lifecycle.at(-1).requestedAmount, '0.5')
  assert.equal(lifecycle.at(-1).walletBalance, 1)
})
