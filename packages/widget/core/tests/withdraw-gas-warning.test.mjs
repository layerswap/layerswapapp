import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true }
const previousGlobals = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

// Keep the real Withdraw, WalletTransferButton, gas predicate and lifecycle
// effects; replace their contexts, presentation and the wallet execution seam.
const mockUrl = `data:text/javascript,${encodeURIComponent(`
  import { createElement } from ${JSON.stringify(import.meta.resolve('react'))}
  export const state = {}
  export const useSwapDataState = () => ({ swapBasicData: state.swap })
  export const useSwapDataUpdate = () => ({ setSubmitedFormValues() {} })
  export const useSettingsState = () => ({ networks: [state.swap.source_network] })
  export const useSelectedAccount = () => ({ address: 'source' })
  export const useBalance = () => ({ balances: state.balances, mutate() {}, isLoading: false })
  export const useFormikContext = () => ({ setFieldValue() {} })
  export const useCallbacks = () => ({ onSwapLifecycle: event => state.events.push(event) })
  export const useQuoteData = () => ({ minAllowedAmount: 0.001, maxAllowedAmount: 10 })
  export const transformSwapDataToQuoteArgs = () => ({})
  const passthrough = ({ children }) => children
  export const Widget = { Content: passthrough, Footer: passthrough }
  export const AnimatePresence = passthrough
  export const motion = { div: passthrough }
  export default () => null
  export const SwapQuoteDetails = () => null
  export const ErrorDisplay = ({ title, message, action, footer }) => createElement('div', null, title, message, action, footer)
  export const AdjustAmountButton = () => createElement('button', null, 'Adjust amount')
  export const RefreshBalanceButton = () => createElement('button', null, 'Refresh balance')
  export const WalletTransferAction = () => createElement('button', null, 'Send transaction')
`)}`
const gasUrl = `data:text/javascript,${encodeURIComponent(`
  import { state } from ${JSON.stringify(mockUrl)}
  export default () => ({ gasData: state.gasData })
`)}`
const mocked = [
  '/context/swap', '/Summary', '/components/Widget/Index', '/SwapQuoteDetails',
  '/lib/balances/useBalance', '/context/settings', '/context/swapAccounts',
  '/validationError/ErrorDisplay', '/hooks/useFee', '/components/Icons/InfoIcon',
  '/validationError/RefreshBalanceButton', '/validationError/AdjustAmountButton',
]
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? ''
  if (parent.endsWith('/Withdraw/Withdraw.js') && (['formik', 'framer-motion'].includes(specifier) || mocked.some(path => specifier.endsWith(path)))) {
    return { url: mockUrl, shortCircuit: true }
  }
  if (parent.endsWith('/Withdraw/WalletTransferButton.js') && specifier === './Wallet') return { url: mockUrl, shortCircuit: true }
  if (parent.includes('/dist/esm/') && specifier.endsWith('/useSWRGas')) return { url: gasUrl, shortCircuit: true }
  if (parent.includes('/dist/esm/hooks/') && specifier.endsWith('/context/callbackProvider')) return { url: mockUrl, shortCircuit: true }
  if (specifier.startsWith('.') && !extname(specifier) && parent.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
  return nextResolve(specifier, context)
} })

const { state } = await import(mockUrl)
const { createRoot } = await import('react-dom/client')
const { default: Withdraw } = await import('../dist/esm/components/Pages/Swap/Withdraw/Withdraw.js')
const token = { symbol: 'ETH', precision: 6, decimals: 18 }
const network = { name: 'ETHEREUM_MAINNET', token }
let root, container
beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  Object.assign(state, {
    events: [],
    swap: { source_network: network, source_token: token, destination_network: { name: 'BASE_MAINNET' }, destination_token: token, requested_amount: '0.95', use_deposit_address: false },
    balances: [{ network: network.name, token: token.symbol, amount: 1, isNativeCurrency: true }],
    gasData: { gas: 0.1, token },
  })
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
const render = () => act(() => root.render(createElement(StrictMode, null, createElement(Withdraw, { type: 'widget' }))))
const blocks = () => state.events.filter(event => event.step === 'transfer_blocked')
const sendButton = () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Send transaction')

test('a gas warning leaves Send available without reporting a blocked transfer', async () => {
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
  assert.equal(sendButton().disabled, false)
  assert.deepEqual(blocks(), [])
  assert.deepEqual(state.events.map(event => event.step), ['awaiting_wallet_action'])

  state.gasData = undefined
  await render()
  state.gasData = { gas: 0.1, token }
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
  assert.equal(sendButton().disabled, false)
  assert.deepEqual(blocks(), [])
})

test('insufficient balance still replaces Send and reports a real block once', async () => {
  state.balances[0].amount = 0.5
  await render()
  await render()
  assert.equal(sendButton(), undefined)
  assert.match(container.textContent, /Insufficient balance/)
  assert.deepEqual(blocks().map(event => event.reasonCode), ['insufficient_balance'])

  state.balances[0].amount = 1
  await render()
  assert.equal(sendButton().disabled, false)
  assert.match(container.textContent, /Insufficient balance for gas/)
  assert.equal(blocks().length, 1)
})

test('deposit-address swaps do not report wallet balance or gas blocks', async () => {
  state.swap.use_deposit_address = true
  state.balances[0].amount = 0.5
  await render()
  assert.deepEqual(state.events, [])
  assert.doesNotMatch(container.textContent, /Insufficient balance/)
})
