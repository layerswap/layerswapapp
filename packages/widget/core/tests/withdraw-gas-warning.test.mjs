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
  export const useSwapDataState = () => ({ swapBasicData: state.swap, quoteIsLoading: state.quoteLoading })
  export const useSwapDataUpdate = () => ({ setSubmitedFormValues(values) { state.submitted = values }, startFreshSwapAttempt() { state.freshAttempts++ }, canAdjustAmount: () => !state.locked })
  export const useSettingsState = () => ({ networks: [state.swap.source_network] })
  export const useSelectedAccount = () => ({ address: 'source' })
  export const useBalance = () => ({ balances: state.balances, mutate() {}, isLoading: false })
  export const useFormikContext = () => ({ values: {}, setValues(values) { state.formValues = values } })
  export const useCallbacks = () => ({ onSwapLifecycle: event => state.events.push(event) })
  export const useQuoteData = () => ({ minAllowedAmount: state.minAllowedAmount, maxAllowedAmount: state.maxAllowedAmount })
  export const transformSwapDataToQuoteArgs = () => ({})
  const passthrough = ({ children }) => children
  export const WalletActionTransition = passthrough
  export const Widget = { Content: passthrough, Footer: passthrough }
  export const AnimatePresence = passthrough
  export const motion = { div: passthrough }
  export default () => null
  export const SwapQuoteDetails = () => null
  export const ErrorDisplay = ({ title, message, action, footer }) => createElement('div', null, title, message, action, footer)
  export const AdjustAmountButton = ({ onEditAmount, isLoading }) => createElement('button', { onClick: onEditAmount, disabled: isLoading }, 'Adjust amount')
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
  '/Presentation/WalletActionTransition',
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
    events: [], locked: false, freshAttempts: 0, submitted: undefined, formValues: undefined, quoteLoading: false,
    swap: { source_network: network, source_token: token, destination_network: { name: 'BASE_MAINNET' }, destination_token: token, requested_amount: '0.95', use_deposit_address: false },
    balances: [{ network: network.name, token: token.symbol, amount: 1, isNativeCurrency: true }],
    gasData: { gas: 0.1, token },
    minAllowedAmount: 0.001, maxAllowedAmount: 10,
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
  assert.equal(blocks()[0].sourceWalletAddress, 'source')
  assert.equal(blocks()[0].walletBalance, 0.5)
  assert.equal(blocks()[0].walletBalanceToken, token.symbol)
  assert.equal(blocks()[0].walletBalanceNetwork, network.name)

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

const adjustButton = () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Adjust amount')
test('Adjust amount explicitly starts a fresh draft with Max enabled', async () => {
  await render()
  await act(() => adjustButton().click())
  assert.equal(state.freshAttempts, 1)
  assert.equal(state.submitted.amountMode, 'max')
  assert.equal(state.submitted.amount, '0.898')
  assert.equal(state.formValues.amount, state.submitted.amount)
})
test('Adjust amount cannot abandon an executing swap', async () => {
  state.locked = true
  await render()
  assert.equal(!!adjustButton(), false, 'Adjust amount must be hidden')
  assert.equal(state.freshAttempts, 0)
})

test('Adjust amount rechecks execution safety if the swap locks after render', async () => {
  await render()
  const button = adjustButton()
  assert.ok(button)
  state.locked = true
  await act(() => button.click())
  assert.equal(state.freshAttempts, 0)
  assert.equal(state.submitted, undefined)
})

function setTokenBalance(amount) {
  const usdt = { symbol: 'USDT', asset: 'USDT', precision: 6, decimals: 6 }
  state.swap.source_token = usdt
  state.swap.requested_amount = '0.2'
  state.balances = [{ network: network.name, token: usdt.symbol, amount, isNativeCurrency: false }]
}

test('zero USDT balance shows Refresh without an ineffective Adjust amount action', async () => {
  setTokenBalance(0)
  await render()
  assert.match(container.textContent, /Insufficient balance/)
  assert.match(container.textContent, /Refresh balance/)
  assert.equal(!!adjustButton(), false, 'Adjust amount must be hidden')
  assert.equal(state.freshAttempts, 0)
})

for (const [name, configure] of [
  ['zero native balance', () => { state.balances[0].amount = 0 }],
  ['balance exhausted by fees', () => { state.balances[0].amount = 0.2; state.gasData.gas = 0.2 }],
  ['spendable balance below minimum', () => { state.balances[0].amount = 0.5; state.gasData.gas = 0.49 }],
  ['missing native fee estimate', () => { state.balances[0].amount = 0.5; state.gasData = undefined }],
  ['missing minimum', () => { state.balances[0].amount = 0.5; state.minAllowedAmount = undefined }],
  ['missing maximum', () => { state.balances[0].amount = 0.5; state.maxAllowedAmount = undefined }],
  ['token balance below minimum', () => { setTokenBalance(0.0005) }],
  ['token amount rounded down below minimum', () => { setTokenBalance(0.0010009); state.minAllowedAmount = 0.0010005 }],
  ['token dust that truncates to zero', () => { setTokenBalance(0.0000009); state.minAllowedAmount = 0 }],
]) {
  test(`${name} hides Adjust amount and preserves Refresh`, async () => {
    configure()
    await render()
    assert.match(container.textContent, /Insufficient balance/)
    assert.match(container.textContent, /Refresh balance/)
    assert.equal(!!adjustButton(), false, 'Adjust amount must be hidden')
  })
}

test('a gas warning without a viable replacement has no Adjust amount action', async () => {
  state.gasData.gas = 2
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
  assert.equal(sendButton().disabled, false)
  assert.equal(!!adjustButton(), false, 'Adjust amount must be hidden')
})

test('Adjust amount appears after funds return, uses a valid boundary amount, and hides again on depletion', async () => {
  setTokenBalance(0)
  state.gasData = undefined // A token transfer does not reserve gas from its token balance.
  await render()
  assert.equal(!!adjustButton(), false, 'Adjust amount must be hidden')
  state.balances[0].amount = state.minAllowedAmount
  await render()
  assert.equal(adjustButton().disabled, false)
  await act(() => adjustButton().click())
  assert.equal(state.submitted.amount, '0.001')
  assert.equal(state.submitted.amountMode, 'max')
  assert.equal(state.formValues.amount, '0.001')
  assert.equal(state.freshAttempts, 1)
  state.balances[0].amount = 0
  await render()
  assert.equal(!!adjustButton(), false, 'Adjust amount must be hidden')
  assert.match(container.textContent, /Refresh balance/)
})

test('an execution lock hides Adjust amount but keeps Refresh available for insufficient balance', async () => {
  setTokenBalance(0.1)
  state.locked = true
  await render()
  assert.equal(!!adjustButton(), false, 'Adjust amount must be hidden')
  assert.match(container.textContent, /Refresh balance/)
  state.locked = false
  await render()
  assert.equal(adjustButton().disabled, false)
})

test('temporary quote loading retains a viable Adjust amount action in its loading state', async () => {
  state.quoteLoading = true
  await render()
  assert.equal(adjustButton().disabled, true)
  state.quoteLoading = false
  await render()
  assert.equal(adjustButton().disabled, false)
})
