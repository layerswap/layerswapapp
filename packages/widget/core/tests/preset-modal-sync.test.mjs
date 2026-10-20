import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import { createRequire } from 'node:module'
import React, { act, createElement, Profiler, StrictMode, useEffect } from 'react'
import { Formik, useFormikContext } from 'formik'
import { JSDOM } from 'jsdom'
import { create } from 'zustand'
import { createSwapContext } from './helpers/swap-context.mjs'
import { resolveSwapFlow } from '../dist/esm/components/utils/resolveSwapFlow.js'
import { loadSource, amountPresets, amountMessages, formValidation, maxHelpers, rounding } from './helpers/source.mjs'

const require = createRequire(import.meta.url)
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.example' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true }))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
const { createRoot } = await import('react-dom/client')
const { default: useSWR, SWRConfig } = await import('swr')

const token = { symbol: 'ETH', decimals: 18, precision: 8, price_in_usd: 2400 }
const source = { name: 'BASE_MAINNET', token, tokens: [token] }
const destination = { name: 'ARBITRUM_MAINNET', token, tokens: [token] }
const settings = { sourceRoutes: [source], destinationRoutes: [destination] }
const state = {}
const { BalanceResolver } = loadSource('lib/balances/balanceResolver.ts', {
  '@/lib/ErrorHandler': { ErrorHandler() {} },
  '@layerswap/widget-types': { classifyNodeError: () => 'rpc', extractErrorDetails: error => ({ message: error.message }) },
  '../knownIds': { default: { Networks: {} } },
  '../widgetTelemetry': { widgetTelemetry: { beginOperation: () => () => {} } },
})
const context = createSwapContext({
  Client: class {}, getSwapId: () => undefined, getAccount: () => state.account,
  overrides: { '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts') },
})
const { generateSwapInitialValuesFromSwap } = loadSource('lib/generateSwapInitialValues.ts', {
  './address/Address': {}, './extendedRoutes/registry': {},
})
const { default: Controller } = loadSource('components/Pages/Swap/Form/AmountPresetController.tsx', {
  react: React, formik: require('formik'), swr: { default: useSWR }, '@/context/swap': context,
  '@/context/swapAccounts': { useSelectedAccount: () => state.account },
  '@/hooks/useWallet': { default: () => ({ wallets: [state.account] }) },
  '@/hooks/useFee': { transformFormValuesToQuoteArgs: values => values, useQuoteData: () => ({ maxAllowedAmount: 1, minAllowedAmount: state.minimum }) },
  '@/hooks/useFormValidation': formValidation,
  '@/lib/balances/useBalance': { useBalance: () => ({ balances: state.balances, isLoading: state.balanceLoading }) },
  '@/lib/amountPresets': amountPresets,
  '@/lib/amountMessages': amountMessages,
  '@/stores/usdModeStore': { useUsdModeStore: selector => usdStore(selector) },
  '@/lib/resolvers/resolverService': { resolverService: { getGasResolver: () => ({ getGas: async () => {
    await state.gasRequest?.promise
    if (state.gasError) throw state.gasError
    return state.gas
  } }) } },
})
const usdStore = create(set => ({ isUsdMode: false, usdAmount: '', setUsdAmount: usdAmount => set({ usdAmount }) }))
const { useUsdTokenSync } = loadSource('hooks/useUsdTokenSync.ts', {
  '@/components/utils/formatTokenAmount': loadSource('components/utils/formatTokenAmount.ts'),
  react: React, '@/lib/amountPresets': amountPresets, '@/stores/usdModeStore': { useUsdModeStore: usdStore },
})
const { default: Summary } = loadSource('components/Pages/Swap/Withdraw/Summary/index.tsx', {
  '@/context/swap': context,
  './Summary': { default: props => createElement('span', { 'aria-label': 'Source amount' }, props.swap.requested_amount) },
  '@/lib/apiClients/layerSwapApiClient': { TransactionType: { Input: 'input', Output: 'output' } },
  '@/lib/address/Address': {}, '@/lib/knownIds': { default: { Exchanges: {} } },
  '@/context/settings': { useInitialSettings: () => ({}) },
  '@/context/swapAccounts': { useSelectedAccount: () => state.account },
})
const passthrough = ({ children }) => children
const gasHook = { default: () => ({ gasData: state.gas }) }
const { default: useOutOfGas } = loadSource('lib/gases/useOutOfGas.ts', { './useSWRGas': gasHook })
const errorDisplay = loadSource('components/Pages/Swap/Form/SecondaryComponents/validationError/ErrorDisplay.tsx', { react: React })
const availabilityView = loadSource('components/Pages/Swap/Withdraw/Presentation/QuoteAvailabilityView.tsx', {
  'lucide-react': { RouteOff: () => null },
  '../../Form/SecondaryComponents/validationError/ErrorDisplay': errorDisplay,
  '../../Form/SecondaryComponents/validationError/constants': { ICON_CLASSES_WARNING: '' },
})
const { SwapQuoteDetails } = loadSource('components/Pages/Swap/Withdraw/SwapQuoteDetails.tsx', {
  './Presentation/QuoteAvailabilityView': availabilityView,
  '../Form/FeeDetails/SwapQuote': { default: () => createElement('div', null, 'Quote details') },
})

const warningViews = loadSource('components/Pages/Swap/Withdraw/Presentation/BalanceWarningView.tsx', {
  '@/components/Icons/InfoIcon': { default: () => null },
  '../../Form/SecondaryComponents/validationError/ErrorDisplay': errorDisplay,
  '../../Form/SecondaryComponents/validationError/constants': { ICON_CLASSES_WARNING: '' },
})
const { default: SubmitButton } = loadSource('components/Buttons/submitButton.tsx', {
  '../Icons/spinIcon': { default: () => createElement('span', { 'data-spinner': true }) }, clsx: { default: require('clsx') },
})
const noop = () => null
const { SendTransactionView } = loadSource('components/Pages/Swap/Withdraw/Presentation/WalletActionsView.tsx', {
  '@/components/utils/resolveSwapFlow': { resolveSwapFlow },
  '@/components/Buttons/submitButton': { default: SubmitButton },
  '@/components/Icons/FailIcon': { default: noop }, '@/components/Icons/InfoIcon': { default: noop },
  '@/helpers/depositActions': { getActionableDepositAction: noop, isDepositWorkflowComplete: () => false },
  './DepositWorkflowView': { DepositWorkflowView: noop },
  './WalletExecutionTransition': { WalletExecutionTransition: ({ controls }) => controls },
  '@layerswap/ui-kit': { WalletIcon: noop }, 'lucide-react': { Loader2: noop },
  '../../Form/SecondaryComponents/validationError/constants': {},
  '../../Form/SecondaryComponents/validationError/ErrorDismissButton': { default: noop },
  '../../Form/SecondaryComponents/validationError/ErrorDisplay': errorDisplay,
  '../messages/Message': {}, '../Wallet/Common/ensureSourceChain': {},
  '../messages/walletErrorMessage': loadSource('components/Pages/Swap/Withdraw/messages/walletErrorMessage.ts', {
    '@layerswap/widget-types': require('@layerswap/widget-types'),
  }),
})
const callbackImports = {
  react: React,
  '@/hooks/useClientLayoutEffect': loadSource('hooks/useClientLayoutEffect.ts', { react: React }),
  '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: event => state.events.push(event) }) },
  '@layerswap/widget-types': require('@layerswap/widget-types'),
}
// Keep the real footer, warnings and loading button. Only wallet execution is
// replaced: it subscribes to the same quote loading state as SendTransactionButton.
const { default: WalletTransferButton } = loadSource('components/Pages/Swap/Withdraw/WalletTransferButton.tsx', {
  './Presentation/Page2Sections': { WalletTransferView: ({ children, warning }) => createElement('div', null, warning, children) },
  './Wallet': { WalletTransferAction: () => {
    const { quoteIsLoading, quoteError } = context.useSwapDataState()
    useEffect(() => { state.walletMounts++; return () => { state.walletUnmounts++ } }, [])
    return createElement(SendTransactionView, { quoteIsLoading, quoteError: !!quoteError })
  } },
})
const { default: Withdraw } = loadSource('components/Pages/Swap/Withdraw/Withdraw.tsx', {
  react: React, formik: require('formik'), '@/context/swap': context,
  '@layerswap/utils': rounding, '@/components/Input/Amount/helpers': maxHelpers,
  '@/lib/amountPresets': amountPresets,
  '@/components/Widget/Index': { Widget: { Footer: passthrough } },
  '@/context/settings': { useSettingsState: () => ({ networks: [source, destination] }) },
  '@/context/swapAccounts': { useSelectedAccount: () => state.account },
  '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
  '@/hooks/useFee': { transformSwapDataToQuoteArgs: values => values, useQuoteData: () => ({ maxAllowedAmount: 1, minAllowedAmount: state.minimum }) },
  '@/lib/balances/useBalance': { useBalance: () => ({ balances: state.balances }) },
  '@/lib/gases/useSWRGas': gasHook, '@/lib/gases/useOutOfGas': { default: useOutOfGas },
  '../Form/SecondaryComponents/validationError/AdjustAmountButton': { AdjustAmountButton: () => createElement('button', null, 'Adjust amount') },
  '../Form/SecondaryComponents/validationError/RefreshBalanceButton': { RefreshBalanceButton: () => createElement('button', null, 'Refresh') },
  './Presentation/BalanceWarningView': warningViews,
  './WalletTransferButton': { default: WalletTransferButton },
  './Presentation/WalletActionTransition': { WalletActionTransition: passthrough },
  '@/lib/swapLifecycle': { lifecycleContextFromSwap: swap => ({ amount: swap.requested_amount }) },
  '@/hooks/useTransferBlocked': loadSource('hooks/useTransferBlocked.ts', callbackImports),
  '@/hooks/useLifecycleObservation': loadSource('hooks/useLifecycleObservation.ts', callbackImports),
})
let root, container, formik, data, updates, initialValues, config
function Probe() {
  formik = useFormikContext()
  data = context.useSwapDataState()
  updates = context.useSwapDataUpdate()
  useUsdTokenSync({ fromCurrency: formik.values.fromAsset, amount: formik.values.amount,
    amountMode: formik.values.amountMode, setFieldValue: formik.setFieldValue,
    quote: { source_token: { ...token, price_in_usd: state.price } } })
  return createElement(React.Fragment, null, createElement(Controller), data.swapBasicData ? createElement(React.Fragment, null,
    createElement(Summary), state.renderQuoteDetails && createElement('section', { 'data-testid': 'quote-details' },
      createElement(SwapQuoteDetails, { swapBasicData: data.swapBasicData, quote: data.quote, quoteError: data.quoteError, quoteIsLoading: data.quoteIsLoading })), createElement(Withdraw, { type: 'widget' })) : null)
}
// Record committed DOM, including the first render before passive effects sync
// Formik and the draft. Reading only after act() would miss a one-frame warning.
const recordCommit = () => state.commits.push(container.textContent)
const render = () => act(async () => root.render(createElement(StrictMode, null,
  createElement(Profiler, { id: 'review', onRender: recordCommit },
    createElement(SWRConfig, { value: config }, createElement(context.SwapDataProvider, null,
      createElement(Formik, { key: state.formKey, initialValues, onSubmit() {} }, createElement(Probe))))))))
const summaryAmount = () => container.querySelector('[aria-label="Source amount"]').textContent
const openReview = () => act(() => {
  updates.setSubmitedFormValues(formik.values)
  updates.setSwapId(undefined)
  updates.setSwapViewMounted(true)
})
const remountForm = () => {
  initialValues = generateSwapInitialValuesFromSwap(data.swapBasicData, false, settings, 'cross-chain')
  state.formKey++
  return render()
}
const decreaseBalance = () => {
  state.balances = [{ ...state.balances[0], amount: 0.00141163, request_time: 2 }]
  return render()
}
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  Object.assign(state, { account: { id: 'wallet', address: 'source' }, formKey: 0, minimum: 0.00001, price: 2400,
    renderQuoteDetails: false, events: [], commits: [], walletMounts: 0, walletUnmounts: 0,
    gas: { gas: 0.0000001, token }, gasRequest: undefined, gasError: undefined, balanceLoading: false,
    balances: [{ amount: 0.00182643, network: source.name, token: token.symbol, request_time: 1, isNativeCurrency: true }] })
  initialValues = { from: source, to: destination, fromAsset: token, toAsset: token, destination_address: 'destination',
    depositMethod: 'wallet', amount: '0.00182505', amountMode: 'max',
    amountPresetSource: amountPresets.amountPresetSource(source.name, token.symbol, 'wallet', 'source') }
  usdStore.setState({ isUsdMode: false, usdAmount: '' })
  config = { provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false }
})
afterEach(async () => { await act(() => root.unmount()); container.remove() })
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
  }
})

for (const isUsdMode of [false, true]) {
  for (const mode of ['max', 'half', 'min']) {
    test(`${mode} survives an open-modal form remount and resumes updates in ${isUsdMode ? 'USD' : 'token'} mode`, async () => {
      initialValues.amountMode = mode
      usdStore.setState({ isUsdMode })
      await render(); await openReview()
      const before = data.swapBasicData.requested_amount
      await remountForm()
      assert.equal(formik.values.amountMode, mode)
      assert.equal(data.swapBasicData.amountMode, mode)
      assert.equal(summaryAmount(), data.swapBasicData.requested_amount)
      assert.equal(data.swapId, undefined)
      assert.equal(data.amountPresetLocked, false)
      await decreaseBalance()
      // Min follows the route minimum; Max/50% follow the reduced spendable balance.
      if (mode === 'min') { state.minimum = 0.00002; await render() }
      const expected = mode === 'min' ? 0.00002 : (0.00141163 - 0.0000001 * 1.02) * (mode === 'half' ? 0.5 : 1)
      assert.ok(Math.abs(Number(data.swapBasicData.requested_amount) - expected) < 1e-17)
      assert.notEqual(data.swapBasicData.requested_amount, before)
      assert.equal(data.swapBasicData.requested_amount, formik.values.amount)
      assert.equal(data.swapBasicData.amountPresetPending, false)
      assert.equal(summaryAmount(), data.swapBasicData.requested_amount)
      const tokenAmount = formik.values.amount
      state.price = 1200
      await render()
      assert.equal(formik.values.amount, tokenAmount, 'price changes cannot increase a preset token amount')
      if (isUsdMode) assert.equal(Number(usdStore.getState().usdAmount), Number((Number(tokenAmount) * state.price).toFixed(2)))
    })
  }
}

for (const mode of ['max', 'half']) {
  test(`${mode} updates the open review after an external transfer without a remount`, async () => {
    initialValues.amountMode = mode
    await render(); await openReview()
    const before = data.swapBasicData.requested_amount
    await decreaseBalance()
    assert.ok(Number(data.swapBasicData.requested_amount) < Number(before))
    assert.equal(data.swapBasicData.requested_amount, formik.values.amount)
    assert.equal(summaryAmount(), data.swapBasicData.requested_amount)
  })
  test(`${mode} cannot change the amount when a remounted form belongs to an already created swap`, async () => {
    initialValues.amountMode = mode
    await render(); await openReview()
    await act(() => updates.setSwapId('created'))
    const before = data.swapBasicData.requested_amount
    await remountForm(); await decreaseBalance()
    assert.equal(data.amountPresetLocked, true)
    assert.equal(data.swapBasicData.requested_amount, before)
    assert.equal(summaryAmount(), data.swapBasicData.requested_amount)
  })
}

test('manual amounts stay fixed across a remount and external transfer', async () => {
  initialValues.amountMode = 'manual'; initialValues.amountPresetSource = undefined
  await render(); await openReview()
  const before = data.swapBasicData.requested_amount
  await remountForm(); await decreaseBalance()
  assert.equal(data.swapBasicData.requested_amount, before)
  assert.equal(formik.values.amountMode, 'manual')
  assert.equal(summaryAmount(), data.swapBasicData.requested_amount)
})

test('restoring a draft never applies its preset to a different funding account', async () => {
  await render(); await openReview()
  state.account = { ...state.account, address: 'different-source' }
  await remountForm()
  assert.equal(formik.values.amountMode, 'manual')
  assert.equal(data.swapBasicData.amountMode, 'manual')
  assert.equal(summaryAmount(), data.swapBasicData.requested_amount)
})

test('a restored preset waits for a pending wallet operation before resuming balance updates', async () => {
  await render(); await openReview()
  const before = data.swapBasicData.requested_amount
  let release
  await act(() => { release = updates.acquireWalletExecution() })
  await remountForm(); await decreaseBalance()
  assert.equal(data.amountPresetLocked, true)
  assert.equal(data.swapBasicData.requested_amount, before)
  assert.equal(summaryAmount(), data.swapBasicData.requested_amount)
  await act(() => release())
  assert.ok(Number(data.swapBasicData.requested_amount) < Number(before))
  assert.equal(data.swapBasicData.requested_amount, formik.values.amount)
  assert.equal(summaryAmount(), data.swapBasicData.requested_amount)
})

const blocks = () => state.events.filter(event => event.step === 'transfer_blocked')
const setBalance = amount => {
  state.balances = [{ ...state.balances[0], amount, request_time: state.balances[0].request_time + 1 }]
  return render()
}
for (const mode of ['max', 'half']) {
  for (const isUsdMode of [false, true]) {
    test(`${mode} never flashes insufficient funds during a delayed balance recalculation in ${isUsdMode ? 'USD' : 'token'} mode`, async () => {
      initialValues.amountMode = mode
      usdStore.setState({ isUsdMode })
      await render(); await openReview()
      const before = data.swapBasicData.requested_amount
      const mounts = state.walletMounts, unmounts = state.walletUnmounts
      state.commits = []
      state.gasRequest = Promise.withResolvers()
      // Drain enough to invalidate even the previously reviewed 50% amount.
      await setBalance(0.0004)
      assert.equal(data.swapBasicData.requested_amount, before)
      assert.equal(data.swapBasicData.amountPresetPending, true)
      assert.ok(state.commits.length > 1, 'captures the fresh-balance commit and subsequent pending state')
      assert.ok(state.commits.every(text => !text.includes('Insufficient balance')), state.commits.join('\n'))
      assert.equal(container.querySelector('button').disabled, true)
      assert.match(container.textContent, /Preparing…/)
      assert.ok(container.querySelector('[data-spinner]'))
      assert.deepEqual(blocks(), [])
      assert.equal(state.walletMounts, mounts)
      assert.equal(state.walletUnmounts, unmounts, 'recalculation must not unmount the wallet action')
      await act(() => state.gasRequest.resolve())
      assert.ok(Number(data.swapBasicData.requested_amount) < 0.0004)
      assert.equal(data.swapBasicData.amountPresetPending, false)
      assert.equal(container.querySelector('button').disabled, false)
      assert.ok(state.commits.every(text => !text.includes('Insufficient balance')))
      assert.deepEqual(blocks(), [])
    })
  }
}

test('a decrease that only makes gas unaffordable also avoids a transient warning', async () => {
  await render(); await openReview()
  state.commits = []
  state.gasRequest = Promise.withResolvers()
  await setBalance(Number(data.swapBasicData.requested_amount))
  assert.ok(state.commits.every(text => !text.includes('Insufficient balance')), state.commits.join('\n'))
  assert.equal(container.querySelector('button').disabled, true)
  await act(() => state.gasRequest.resolve())
  assert.ok(state.commits.every(text => !text.includes('Insufficient balance')))
})

test('Min shows a genuine insufficient balance only after the recalculation settles', async () => {
  initialValues.amountMode = 'min'
  await render(); await openReview()
  state.commits = []
  state.gasRequest = Promise.withResolvers()
  await setBalance(state.minimum / 2)
  assert.ok(state.commits.every(text => !text.includes('Insufficient balance')), state.commits.join('\n'))
  await act(() => state.gasRequest.resolve())
  assert.equal(data.swapBasicData.amountPresetPending, false)
  assert.equal(data.swapBasicData.amountPresetError, 'Insufficient ETH balance')
  assert.match(container.textContent, /Insufficient balance/)
  assert.deepEqual(blocks().map(event => event.reasonCode), ['insufficient_balance'])
})

test('a settled fee failure does not hide an insufficient balance behind an endless loader', async () => {
  await render(); await openReview()
  state.gasRequest = Promise.withResolvers()
  state.gasError = new Error('RPC unavailable')
  await setBalance(0.0004)
  await act(() => state.gasRequest.resolve())
  assert.equal(data.swapBasicData.amountPresetPending, false)
  assert.equal(data.swapBasicData.amountPresetError, 'Network fee unavailable')
  assert.match(container.textContent, /Insufficient balance/)
  assert.deepEqual(blocks().map(event => event.reasonCode), ['insufficient_balance'])
})

test('a manual amount reports insufficient funds immediately', async () => {
  initialValues.amountMode = 'manual'; initialValues.amountPresetSource = undefined
  await render(); await openReview()
  state.commits = []
  await setBalance(0.0004)
  assert.match(state.commits[0], /Insufficient balance/)
  assert.deepEqual(blocks().map(event => event.reasonCode), ['insufficient_balance'])
})

test('a preset frozen for wallet execution still reports insufficient funds', async () => {
  await render(); await openReview()
  await act(() => updates.acquireWalletExecution())
  const before = data.swapBasicData.requested_amount
  state.commits = []
  await setBalance(0.0004)
  assert.equal(data.swapBasicData.requested_amount, before)
  assert.match(state.commits[0], /Insufficient balance/)
  assert.deepEqual(blocks().map(event => event.reasonCode), ['insufficient_balance'])
})

for (const mode of ['min', 'half', 'max']) {
  for (const isUsdMode of [false, true]) {
    test(`${mode} reports empty balance responses and recovers the review draft in ${isUsdMode ? 'USD' : 'token'} mode`, async () => {
      state.renderQuoteDetails = true
      initialValues.amountMode = mode
      usdStore.setState({ isUsdMode })
      const resolvedBalances = state.balances
      state.balances = undefined
      state.balanceLoading = true
      await render(); await openReview()
      assert.equal(formik.values.amountPresetError, undefined, 'initial loading is not a balance failure')
      assert.equal(data.swapBasicData.amountPresetPending, true)
      const initialAmount = formik.values.amount

      // Use the actual resolver: a provider-wide RPC failure resolves to an
      // empty list rather than rejecting or attaching a per-token error.
      const resolver = new BalanceResolver([{ supportsNetwork: () => true,
        fetchBalance: async () => { throw new Error('Balance RPC unavailable') } }])
      const failed = await resolver.getBalance(source, state.account.address)
      assert.deepEqual(failed, { balances: [] })
      state.balances = failed.balances
      state.balanceLoading = false
      await render()
      const assertUnavailable = amount => {
        assert.equal(formik.values.amountPresetPending, false)
        assert.equal(formik.values.amountPresetError, 'Balance unavailable')
        assert.equal(formik.values.amount, amount)
        assert.equal(data.swapBasicData.amountPresetPending, false)
        assert.equal(data.quoteIsLoading, false)
        assert.equal(data.quoteError.message, 'Balance unavailable')
        assert.equal(container.querySelector('[data-testid=quote-details]').textContent, 'Balance unavailable')
        assert.equal(summaryAmount(), amount)
        assert.equal(container.querySelector('button').disabled, true, 'cannot submit an unavailable preset')
        assert.doesNotMatch(container.textContent, /Preparing…/)
      }
      assertUnavailable(initialAmount)

      state.balanceLoading = true
      await render()
      assert.equal(formik.values.amountPresetError, undefined, 'a retry can wait while cached empty data is present')
      assert.equal(data.swapBasicData.amountPresetPending, true)
      state.balances = resolvedBalances
      state.balanceLoading = false
      await render()
      assert.equal(data.swapBasicData.amountPresetPending, false)
      assert.equal(data.swapBasicData.amountPresetError, undefined)
      assert.equal(container.querySelector('button').disabled, false)
      // This fixture leaves the quote service unresolved after preset recovery.
      assert.ok(container.querySelector('[data-testid=quote-details] [aria-label="Loading quote"]'))
      assert.equal(container.querySelector('[data-testid=quote-details]').textContent, '')
      const reviewedAmount = formik.values.amount

      state.balances = failed.balances
      await render()
      assertUnavailable(reviewedAmount)
      state.minimum *= 2
      state.balances = [{ ...resolvedBalances[0], amount: 0.0008, request_time: 3 }]
      await render()
      assert.equal(formik.values.amountMode, mode, 'recovery resumes the same preset')
      assert.equal(data.swapBasicData.amountPresetError, undefined)
      assert.equal(data.swapBasicData.amountPresetPending, false)
      assert.notEqual(formik.values.amount, reviewedAmount)
      assert.equal(summaryAmount(), formik.values.amount)
      assert.equal(container.querySelector('button').disabled, false)
      if (isUsdMode) assert.equal(Number(usdStore.getState().usdAmount), Number((Number(formik.values.amount) * state.price).toFixed(2)))
    })
  }
}

for (const message of ['Insufficient ETH balance', 'Not enough ETH for network fees', 'Minimum is 0.001 ETH', 'Network fee unavailable']) {
  test(`modal renders ${message} once and recovers after the error clears`, async () => {
    const quote = { source_token: token }
    await act(() => root.render(createElement(SwapQuoteDetails, {
      quote, quoteError: { code: 'AMOUNT_PRESET_UNAVAILABLE', message },
    })))
    assert.equal(container.textContent, message, 'specific error replaces generic copy and stale quote')
    await act(() => root.render(createElement(SwapQuoteDetails, { quote })))
    assert.equal(container.textContent, 'Quote details')
  })
}
for (const quoteError of [
  { code: 'QUOTE_FAILED', message: 'Internal backend details' },
  { code: 'AMOUNT_PRESET_UNAVAILABLE', message: '' },
]) {
  test(`modal retains generic fallback for ${quoteError.code} without a usable preset message`, async () => {
    await act(() => root.render(createElement(SwapQuoteDetails, { quoteError })))
    assert.match(container.textContent, /Unable to retrieve quote/)
    assert.doesNotMatch(container.textContent, /Internal backend details/)
    await act(() => root.render(createElement(SwapQuoteDetails)))
    assert.ok(container.querySelector('[aria-label="Loading quote"]'))
    assert.equal(container.textContent, '')
  })
}
