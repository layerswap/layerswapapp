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
  import { createElement, useEffect } from ${JSON.stringify(import.meta.resolve('react'))}
  export const state = {}
  export const BackendTransactionStatus = { Failed: 'failed' }
  export const TransactionType = { Input: 'input' }
  export const useSwapTransactionStore = selector => selector({ swapTransactions: state.transactions })
  export const useGaslessAuthorizationStore = selector => selector({ authorizations: state.authorizations })
  export const useDepositSignatureStore = selector => selector({ signatures: state.signatures })
  export const useSwapDataState = () => ({ swapBasicData: state.swap, walletActionExecuting: state.locked, swapId: state.swapId, swapDetails: state.details, depositActionsResponse: state.actions })
  export const useSwapDataUpdate = () => ({ setSubmitedFormValues() {} })
  export const useSettingsState = () => ({ networks: [state.swap.source_network] })
  export const useSelectedAccount = () => ({ address: 'source' })
  export const useBalance = () => ({ balances: state.balances, mutate() {}, isLoading: false })
  export const useFormikContext = () => ({ setFieldValue() {} })
  export const useCallbacks = () => ({ onSwapLifecycle: event => state.events.push(event) })
  export const useQuoteData = () => ({ minAllowedAmount: 0.001, maxAllowedAmount: state.maxAllowedAmount })
  export const transformSwapDataToQuoteArgs = () => ({})
  const passthrough = ({ children }) => children
  export const useHydratedReducedMotion = () => false
  export const Widget = { Content: passthrough, Footer: passthrough }
  export const AnimatePresence = passthrough
  export const motion = { div: passthrough }
  export default () => null
  export const SwapQuoteDetails = () => null
  export const ErrorDisplay = ({ title, message, action, footer }) => createElement('div', null, title, message, action, footer)
  export const AdjustAmountButton = () => createElement('button', null, 'Adjust amount')
  export const RefreshBalanceButton = () => createElement('button', null, 'Refresh balance')
  export const WalletTransferAction = () => {
    useEffect(() => { state.mounts++; return () => { state.unmounts++ } }, [])
    return createElement('button', null, 'Send transaction')
  }
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
  if (parent.endsWith('/Presentation/WalletActionTransition.js') && (specifier === 'framer-motion' || specifier.endsWith('/useHydratedReducedMotion'))) return { url: mockUrl, shortCircuit: true }
  if (parent.includes('/dist/esm/') && (specifier.endsWith('/stores/swapTransactionStore') || specifier.endsWith('/apiClients/layerSwapApiClient'))) return { url: mockUrl, shortCircuit: true }
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
    events: [], locked: false, mounts: 0, unmounts: 0, swapId: undefined, details: undefined, actions: undefined, transactions: {}, authorizations: {}, signatures: {},
    swap: { source_network: network, source_token: token, destination_network: { name: 'BASE_MAINNET' }, destination_token: token, requested_amount: '0.95', use_deposit_address: false },
    balances: [{ network: network.name, token: token.symbol, amount: 1, isNativeCurrency: true }],
    gasData: { gas: 0.1, token },
    maxAllowedAmount: 10,
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

test('a native reserve triggers a gas warning when the amount and fee are covered', async () => {
  state.gasData = { gas: 0.01, token }
  await render()
  assert.doesNotMatch(container.textContent, /Insufficient balance for gas/)

  state.gasData.reserve = 0.1
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
  assert.equal(sendButton().disabled, false)
  assert.deepEqual(blocks(), [])

  state.gasData.reserve = 0
  await render()
  assert.doesNotMatch(container.textContent, /Insufficient balance for gas/)
})

test('a balance that exactly covers the amount, fee and reserve has no gas warning', async () => {
  state.swap.requested_amount = '0.75'
  state.gasData = { gas: 0.125, reserve: 0.125, token }
  await render()
  assert.doesNotMatch(container.textContent, /Insufficient balance for gas/)

  state.swap.requested_amount = '0.750001'
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
})

test('a native reserve is required even when the gas fee is zero', async () => {
  state.gasData = { gas: 0, reserve: 0.1, token }
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
  assert.equal(sendButton().disabled, false)
  assert.deepEqual(blocks(), [])
})

test('the route maximum cutoff includes the native reserve', async () => {
  state.swap.requested_amount = '0.9'
  state.maxAllowedAmount = 0.9
  state.gasData = { gas: 0.01, reserve: 0.2, token }
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
test('a balance refresh during execution does not replace the wallet flow or report a block', async () => {
  await render()
  const send = sendButton()
  const mounts = state.mounts
  const unmounts = state.unmounts
  state.locked = true
  state.balances[0].amount = 0.01
  await render()
  assert.equal(sendButton(), send)
  assert.equal(state.mounts, mounts)
  assert.equal(state.unmounts, unmounts)
  assert.doesNotMatch(container.textContent, /Insufficient balance/)
  assert.deepEqual(blocks(), [])

  // A failed attempt that can safely be adjusted restores balance validation.
  state.locked = false
  await render()
  assert.equal(sendButton(), undefined)
  assert.deepEqual(blocks().map(event => event.reasonCode), ['insufficient_balance'])
})


for (const progress of ['local transaction', 'input confirmation', 'refund completion']) {
  test(`${progress} prevents post-send balance blocks after the wallet request settles`, async () => {
    await render()
    state.swapId = 'submitted-swap'
    state.balances[0].amount = 0.01
    if (progress === 'local transaction') state.transactions[state.swapId] = { hash: '0x123', status: 'pending' }
    if (progress === 'input confirmation') state.details = { transactions: [{ type: 'input', status: 'completed', transaction_hash: '0x123' }] }
    if (progress === 'refund completion') state.details = { status: 'refunded' }
    await render()
    assert.ok(sendButton())
    assert.doesNotMatch(container.textContent, /Insufficient balance/)
    assert.deepEqual(blocks(), [])
  })
}
