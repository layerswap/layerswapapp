import { widgetTelemetry } from '../dist/esm/lib/widgetTelemetry.js'
import { createPortal } from 'react-dom'
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
  export const useSwapDataState = () => ({ swapBasicData: state.swap, swapId: state.swapId, swapDetails: state.swapDetails, inputTransactionStatus: state.inputTransactionStatus, depositActionsResponse: state.actions, quoteIsLoading: state.quoteLoading })
  export const useSwapDataUpdate = () => ({ setSubmitedFormValues(values) { state.submitted = values }, startFreshSwapAttempt() { state.freshAttempts++ }, canAdjustAmount: () => !state.locked })
  export const useSettingsState = () => ({ networks: [state.swap.source_network] })
  export const useSelectedAccount = () => ({ address: state.walletAddress ?? 'source' })
  export const useBalance = () => ({ balances: state.balances, mutate() {}, isLoading: false })
  export const useOptionalCallbacks = () => ({})
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
  export default (...args) => { state.gasRequests.push(args); return { gasData: state.gasData } }
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
    if (context.parentURL?.endsWith('/helpers/swapProgress.js') && specifier.endsWith('/lib/apiClients/layerSwapApiClient')) {
      return { url: 'data:text/javascript,export const TransactionType = { Input: "input" }; export const BackendTransactionStatus = { Failed: "failed" };', shortCircuit: true }
    }
  if (['/TransferBlock.js', '/useHasSubmittedTransfer.js'].some(path => parent.endsWith(path)) && specifier.endsWith('/context/swap')) return { url: mockUrl, shortCircuit: true }
  if (parent.endsWith('/Withdraw/Withdraw.js') && (specifier === 'framer-motion' || mocked.some(path => specifier.endsWith(path)))) {
    return { url: mockUrl, shortCircuit: true }
  }
  if (parent.endsWith('/Withdraw/WalletTransferButton.js') && specifier === './Wallet') return { url: mockUrl, shortCircuit: true }
  if (parent.includes('/dist/esm/') && specifier.endsWith('/useSWRGas')) return { url: gasUrl, shortCircuit: true }
  if ((parent.includes('/dist/esm/hooks/') || parent.endsWith('/TransferBlock.js')) && specifier.endsWith('/context/callbackProvider')) return { url: mockUrl, shortCircuit: true }
  if (specifier.startsWith('.') && !extname(specifier) && parent.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
  return nextResolve(specifier, context)
} })

const { state } = await import(mockUrl)
const { createRoot } = await import('react-dom/client')
const { default: Withdraw } = await import('../dist/esm/components/Pages/Swap/Withdraw/Withdraw.js')
const { useSwapTransactionStore } = await import('../dist/esm/stores/swapTransactionStore.js')
const token = { symbol: 'ETH', precision: 6, decimals: 18 }
const network = { name: 'ETHEREUM_MAINNET', type: 'evm', token }
let root, container
beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  useSwapTransactionStore.setState({ swapTransactions: {}, pendingSubmissions: {} })
  Object.assign(state, {
    swapId: undefined, swapDetails: undefined, inputTransactionStatus: undefined,
    actions: undefined, gasRequests: [], events: [], walletAddress: undefined, locked: false, freshAttempts: 0, submitted: undefined, formValues: undefined, quoteLoading: false,
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
const createWithdrawal = () => createElement(Withdraw, {
  type: 'widget',
  onAdjustAmount(updates) {
    state.formValues = { ...state.formValues, ...updates }
    state.submitted = state.formValues
  },
})
const render = () => act(() => root.render(createElement(StrictMode, null, createWithdrawal())))
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

test('a balance that exactly covers the amount, buffered fee and reserve has no gas warning', async () => {
  state.swap.requested_amount = '0.7475'
  state.gasData = { gas: 0.125, reserve: 0.125, token }
  await render()
  assert.doesNotMatch(container.textContent, /Insufficient balance for gas/)

  state.swap.requested_amount = '0.747501'
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
})

test('Adjust amount uses the maximum fee and retains the required native balance across updates', async () => {
  state.balances[0].amount = 20
  state.swap.requested_amount = '19'
  state.gasData = { gas: 0.01, maxFee: 0.02, reserve: 10, token }
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
  const adjust = () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Adjust amount')
  await act(() => adjust().click())
  assert.ok(Math.abs(Number(state.formValues.amount) - 9.9796) < 1e-6)
  assert.equal(state.submitted.amount, state.formValues.amount)
  assert.equal(state.freshAttempts, 1)

  state.gasData = { ...state.gasData, maxFee: 0.04, reserve: 11 }
  await render()
  await act(() => adjust().click())
  assert.ok(Math.abs(Number(state.formValues.amount) - 8.9592) < 1e-6)
  assert.equal(state.freshAttempts, 2)
})

test('the gas warning uses the maximum fee when the expected fee is affordable', async () => {
  state.swap.requested_amount = '0.74'
  state.gasData = { gas: 0.01, maxFee: 0.125, reserve: 0.125, token }
  await render()
  assert.doesNotMatch(container.textContent, /Insufficient balance for gas/)

  state.gasData.maxFee = 0.25
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
  assert.equal(sendButton().disabled, false)
  assert.deepEqual(blocks(), [])
})

test('a balance covering the fee but missing its safety buffer offers Adjust amount', async () => {
  state.swap.requested_amount = '0.855'
  state.gasData = { gas: 0.01, maxFee: 0.125, reserve: 0.02, token }
  await render()
  assert.match(container.textContent, /Insufficient balance for gas/)
  const adjust = [...container.querySelectorAll('button')].find(button => button.textContent === 'Adjust amount')
  await act(() => adjust.click())
  assert.ok(Math.abs(Number(state.formValues.amount) - 0.8525) < 1e-6)
  assert.equal(sendButton().disabled, false)
  assert.deepEqual(blocks(), [])
})

test('the warning and adjustment request the current deposit action payload', async () => {
  state.actions = [{ type: 'transfer', to_address: 'recipient', amount: 0.95, amount_in_base_units: '950000000000000001', call_data: '0x1234', network, token }]
  await render()
  assert.ok(state.gasRequests.length > 0)
  for (const args of state.gasRequests) {
    assert.equal(args[3], 0.95)
    assert.deepEqual(args[5].transaction, {
      recipientAddress: 'recipient', callData: '0x1234', amountInBaseUnits: '950000000000000001',
    })
  }
})

test('deposit actions for another source account cannot replace its gas estimate', async () => {
  state.actions = [{ type: 'transfer', from_address: 'other-source', to_address: 'recipient', amount: 0.5, call_data: '0x1234', network, token }]
  await render()
  for (const args of state.gasRequests) {
    assert.equal(args[3], state.swap.requested_amount)
    assert.equal(args[5].transaction, undefined)
  }
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
  const awaiting = state.events.find(event => event.step === 'awaiting_wallet_action')
  for (const key of ['sourceWalletAddress', 'walletBalance', 'walletBalanceNetwork', 'walletBalanceToken', 'walletBalanceTimestamp']) {
    assert.equal(key in awaiting, false, `awaiting callback must not expose ${key}`)
  }
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

test('Adjust amount rechecks execution safety if the swap locks after render', async t => {
  t.after(widgetTelemetry.mount(widgetTelemetry.createFlow({ source_network: network.name })))
  widgetTelemetry.recordAmountInput('manual')
  await render()
  const button = adjustButton()
  assert.ok(button)
  state.locked = true
  await act(() => button.click())
  assert.equal(state.freshAttempts, 0)
  assert.equal(state.submitted, undefined)
  assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'manual')
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

test('portaled Adjust amount records Max after its guard without changing the adjustment', async () => {
  const unmount = widgetTelemetry.mount(widgetTelemetry.createFlow({ source_network: network.name, source_token: token.symbol }))
  const portal = document.createElement('div'); document.body.append(portal)
  try {
    widgetTelemetry.recordAmountInput('manual')
    await act(() => root.render(createElement(StrictMode, null, createPortal(createWithdrawal(), portal))))
    const button = [...portal.querySelectorAll('button')].find(button => button.textContent === 'Adjust amount')
    assert.ok(button)
    assert.equal(button.closest('[data-ls-form]'), null)
    assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'manual')
    await act(() => button.click())
    assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'max')
    assert.equal(state.freshAttempts, 1)
    assert.equal(state.submitted.amountMode, 'max')
    assert.equal(state.submitted.amount, '0.898')
  } finally { unmount(); portal.remove() }
})

test('an insufficient-balance warning after wallet switching records the selected wallet balance', async () => {
  await render()
  assert.deepEqual(blocks(), [])
  state.walletAddress = 'wallet-B'
  state.balances = [{ ...state.balances[0], amount: 0.25, request_time: 'wallet-B-read' }]
  await render()
  assert.equal(blocks().length, 1)
  assert.equal(blocks()[0].sourceWalletAddress, 'wallet-B')
  assert.equal(blocks()[0].walletBalance, 0.25)
  assert.equal(blocks()[0].walletBalanceToken, token.symbol)
  assert.equal(blocks()[0].walletBalanceNetwork, network.name)
  assert.equal(blocks()[0].walletBalanceTimestamp, 'wallet-B-read')
})

for (const receipt of [
  { hash: '0xsubmitted', kind: 'wallet-transfer' },
  { kind: 'wallet-transfer', providerSubmissionAccepted: true },
  { kind: 'atomic-batch', providerSubmissionAccepted: true },
  { kind: 'atomic-batch', hash: '0xbatch' },
]) {
  test(`spent balance after ${JSON.stringify(receipt)} leaves status controls mounted without a block`, async () => {
    state.swapId = 'submitted-swap'
    await render()
    useSwapTransactionStore.setState({ swapTransactions: { [state.swapId]: receipt } })
    state.balances = [{ ...state.balances[0], amount: 0.0000334586 }]
    await render()
    assert.ok(sendButton(), 'funding warnings must not replace the execution controls')
    assert.doesNotMatch(container.textContent, /Refresh balance|Insufficient balance/)
    assert.deepEqual(blocks(), [])
  })
}

test('recording a hash and clearing submission-pending never reopens the funding block', async () => {
  state.swapId = 'submitted-swap'
  useSwapTransactionStore.setState({ pendingSubmissions: { [state.swapId]: true } })
  await render()
  await act(() => useSwapTransactionStore.getState().setSwapTransaction(state.swapId, '0xhash', 'wallet-transfer'))
  state.balances = [{ ...state.balances[0], amount: 0.0000334586 }]
  await render()
  assert.ok(sendButton())
  assert.deepEqual(blocks(), [])
})

test('backend input evidence suppresses a spent-balance warning without a local receipt', async () => {
  state.swapDetails = { id: 'restored-swap', transactions: [{ type: 'input', status: 'pending', transaction_hash: '0xinput' }] }
  state.balances = [{ ...state.balances[0], amount: 0.0000334586 }]
  await render()
  assert.ok(sendButton())
  assert.deepEqual(blocks(), [])
})

test('a definitively failed hash restores the actual funding block', async () => {
  state.swapId = 'failed-swap'
  useSwapTransactionStore.setState({ swapTransactions: { [state.swapId]: { kind: 'wallet-transfer', hash: '0xfailed' } } })
  state.inputTransactionStatus = { hash: '0xfailed', status: 'failed' }
  state.balances = [{ ...state.balances[0], amount: 0.1 }]
  await render()
  assert.equal(sendButton(), undefined)
  assert.match(container.textContent, /Refresh balance/)
  assert.deepEqual(blocks().map(event => event.reasonCode), ['insufficient_balance'])
})
