import { widgetTelemetry, captureWidgetInteraction } from '../dist/esm/lib/widgetTelemetry.js'
import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import { createRequire } from 'node:module'
import React, { act, createElement, createContext, StrictMode } from 'react'
import { Formik, useFormikContext } from 'formik'
import { JSDOM } from 'jsdom'
import { loadSource, amountPresets, amountMessages, formValidation, maxHelpers, rounding } from './helpers/source.mjs'

const require = createRequire(import.meta.url)
const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, Element: dom.window.Element, IS_REACT_ACT_ENVIRONMENT: true }))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
const { createRoot } = await import('react-dom/client')
const { default: useSWR, SWRConfig, useSWRConfig } = await import('swr')
const state = {}
const { default: FormTelemetry } = loadSource('components/Pages/Swap/Form/FormTelemetry.tsx', {
  react: React, formik: require('formik'), '@/lib/widgetTelemetry': { widgetTelemetry },
  '@/hooks/useClientLayoutEffect': { useClientLayoutEffect: React.useLayoutEffect },
  '@/context/swapAccounts': { useSelectedAccount: () => state.account },
})
const SwapDataStateContext = createContext(null)
const SwapDataUpdateContext = createContext(null)
const { default: Controller } = loadSource('components/Pages/Swap/Form/AmountPresetController.tsx', {
  react: React, formik: require('formik'), swr: { default: useSWR },
  '@/context/swap': { SwapDataStateContext, SwapDataUpdateContext },
  '@/context/swapAccounts': { useSelectedAccount: () => state.account },
  '@/hooks/useWallet': { default: () => ({ wallets: state.wallets }) },
  '@/hooks/useFee': { transformFormValuesToQuoteArgs: v => v, useQuoteData: () => {
    const { data } = useSWR('/limits', null)
    return { maxAllowedAmount: data?.data?.max_amount ?? state.limit, minAllowedAmount: data?.data?.min_amount ?? state.minimum, minAllowedAmountInUsd: state.minimum * state.usdPrice, limitsError: state.limitsError, quoteError: state.quoteError }
  } },
  '@/hooks/useFormValidation': formValidation,
  '@/lib/balances/useBalance': { useBalance: () => ({ balances: state.balances, error: state.balanceError }) },
  '@/lib/amountPresets': amountPresets,
  '@/lib/amountMessages': amountMessages,
  '@/stores/usdModeStore': { useUsdModeStore: selector => usdStore(selector) },
  '@/lib/resolvers/resolverService': { resolverService: { getGasResolver: () => ({ getGas: async ({ amount }) => {
    state.probes.push(amount)
    if (state.deferred) return state.deferred.promise
    if (state.error) throw state.error
    if (state.providerGas) return state.providerGas()
    return { gas: state.gas, maxFee: state.maxFee, reserve: state.reserve, token }
  } }) } },
})
const token = { symbol: 'ETH', decimals: 6, price_in_usd: 2000 }
const network = { name: 'ETHEREUM_MAINNET', token }
const usdStore = require('zustand').create(set => ({ isUsdMode: true, usdAmount: '',
  setUsdAmount: usdAmount => set({ usdAmount }), toggleMode: () => set(s => ({ isUsdMode: !s.isUsdMode })),
}))
const { useUsdTokenSync } = loadSource('hooks/useUsdTokenSync.ts', {
  '@/lib/widgetTelemetry': { widgetTelemetry },
  '@/components/utils/formatTokenAmount': loadSource('components/utils/formatTokenAmount.ts'),
  react: React, '@/lib/amountPresets': amountPresets, '@/stores/usdModeStore': { useUsdModeStore: usdStore },
})
const { default: SubmitButton } = loadSource('components/Buttons/submitButton.tsx', {
  '../Icons/spinIcon': { default: () => null }, clsx: { default: require('clsx') },
})
const { default: FormButton } = loadSource('components/Pages/Swap/Form/SecondaryComponents/FormButton.tsx', {
  '@/components/Input/SourceWalletPicker': { FormSourceWalletButton: () => null },
  '@/components/Buttons/submitButton': { default: SubmitButton },
  '@/context/settings': { useInitialSettings: () => ({}) },
  '@/components/Input/Address': { default: ({ children }) => children() },
})
function ValidationButton() {
  const { values } = useFormikContext()
  const isUsdMode = usdStore(s => s.isUsdMode)
  const { message } = formValidation.resolveFormValidation({ values, minAllowedAmount: state.minimum,
    maxAllowedAmount: state.limit, minAllowedAmountInUsd: state.minimum * state.usdPrice, isUsdMode, quoteError: state.quoteError })
  return createElement(FormButton, { values, shouldConnectWallet: false, error: message,
    disabled: !!message || values.amountPresetPending, isSubmitting: false })
}
const { default: ExchangeAmountField } = loadSource('components/Input/Amount/ExchangeAmountField.tsx', {
  '@/lib/widgetTelemetry': { widgetTelemetry },
  react: React, formik: require('formik'),
  '../NumericInput': { default: props => { state.changeExchangeAmount = props.onChange; return null } },
  '@/components/utils/formatUsdAmount': { formatUsd: String },
  clsx: { default: () => '' },
  '@/helpers/tokenHelper': { resolveTokenUsdPrice: () => 2000 },
})
let usd
function UsdProbe() {
  const { values, setFieldValue } = useFormikContext()
  usd = useUsdTokenSync({ quote: { source_token: { ...token, price_in_usd: state.usdPrice } },
    fromCurrency: values.fromAsset, amount: values.amount, amountMode: values.amountMode, setFieldValue })
  return null
}
let root, container, formik, mutate, initialValues, config
const updates = { syncAmountPresetDraft: values => { state.draft = values; return true } }
function Probe() {
  formik = useFormikContext()
  mutate = useSWRConfig().mutate
  return createElement(React.Fragment, null, state.renderTelemetry ? createElement(FormTelemetry, { mode: 'cross-chain' }) : null, createElement(Controller), state.usdMode ? createElement(UsdProbe) : null,
    state.exchangeInput ? createElement(ExchangeAmountField) : null, state.renderPresets ? createElement(PresetButtons) : null,
    state.renderValidation ? createElement(ValidationButton) : null)
}
const render = () => act(async () => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: config },
    createElement(SwapDataStateContext.Provider, { value: { amountPresetLocked: state.locked, amountPresetRevision: state.revision, swapBasicData: state.preparedDraft } },
      createElement(SwapDataUpdateContext.Provider, { value: updates },
        createElement(Formik, { initialValues, onSubmit() {} }, createElement(Probe))))))))
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  Object.assign(state, { account: { id: 'wallet', address: 'source' }, wallets: [{ id: 'wallet' }],
    balances: [{ amount: 1, network: network.name, token: 'ETH', request_time: 1 }], gas: 0.01, maxFee: undefined, reserve: 0,
    usdMode: false, renderTelemetry: false, exchangeInput: false, renderPresets: false, renderValidation: false, providerGas: undefined, previewGas: undefined,
    usdPrice: 2000, limit: 10, minimum: 0.001, probes: [], locked: false, revision: 0, preparedDraft: undefined, deferred: undefined, error: undefined, balanceError: undefined, limitsError: undefined, quoteError: undefined })
  initialValues = { amountMode: 'max', amountPresetSource: amountPresets.amountPresetSource(network.name, 'ETH', 'wallet', 'source'),
    amount: '0.5', from: network, fromAsset: token, to: { name: 'BASE_MAINNET' }, toAsset: token,
    destination_address: 'dest', depositMethod: 'wallet' }
  config = { provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false, errorRetryInterval: 10 }
  usdStore.setState({ isUsdMode: false, usdAmount: '' })
})
afterEach(async () => { await act(() => root.unmount()); container.remove() })
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'Element', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
  }
})

test('Max follows balance, fee and route-limit refreshes, syncing the modal draft', async () => {
  await render()
  assert.equal(formik.values.amount, '0.9898')
  assert.equal(state.draft.amount, formik.values.amount)
  assert.equal(formik.values.amountPresetPending, false)
  assert.ok(state.probes.length <= 2, 'Writing the amount must not create a gas-request loop')
  state.balances = [{ ...state.balances[0], amount: 2, request_time: 2 }]
  await render()
  assert.equal(formik.values.amount, '1.9898')
  state.gas = 0.1
  await act(async () => { await mutate(key => Array.isArray(key) && key[0] === 'amount-preset') })
  assert.equal(formik.values.amount, '1.898')
  assert.equal(state.draft.amount, '1.898')
  state.limit = 0.8
  await render()
  assert.equal(formik.values.amount, '0.8')
})

test('late gas responses cannot change a frozen swap; a fresh draft resumes updating', async () => {
  state.deferred = Promise.withResolvers()
  await render()
  assert.equal(formik.values.amountPresetPending, true)
  state.locked = true
  await render()
  await act(async () => { state.deferred.resolve({ gas: 0.1, token }); await state.deferred.promise })
  assert.equal(formik.values.amount, '0.5')
  state.deferred = undefined
  state.gas = 0.2
  state.locked = false; state.revision++
  await render()
  assert.equal(formik.values.amount, '0.796')
})

for (const change of ['manual input', 'account', 'token', 'network', 'disconnect']) {
  test(`${change} exits Max and ignores pending results`, async () => {
    state.deferred = Promise.withResolvers()
    await render()
    if (change === 'manual input') await act(() => formik.setValues({ ...formik.values, amountMode: 'manual', amount: '0.123' }))
    if (change === 'account') state.account = { ...state.account, address: 'new-source' }
    if (change === 'token') await act(() => formik.setFieldValue('fromAsset', { symbol: 'USDC', decimals: 6 }))
    if (change === 'network') await act(() => formik.setFieldValue('from', { ...network, name: 'BASE_MAINNET' }))
    if (change === 'disconnect') state.wallets = []
    await render()
    const amount = formik.values.amount
    await act(async () => { state.deferred.resolve({ gas: 0.1, token }); await state.deferred.promise })
    assert.equal(formik.values.amountMode, 'manual')
    assert.equal(formik.values.amount, amount)
  })
}

test('failed fees retain the displayed amount and block Max until a successful refresh', async () => {
  await render()
  state.error = new Error('RPC unavailable')
  await act(async () => { await mutate(key => Array.isArray(key) && key[0] === 'amount-preset') })
  assert.equal(formik.values.amount, '0.9898')
  assert.match(formik.values.amountPresetError, /Network fee unavailable/)
  state.error = undefined; state.gas = 0.1
  await act(async () => { await mutate(key => Array.isArray(key) && key[0] === 'amount-preset') })
  assert.equal(formik.values.amountPresetError, undefined)
  assert.equal(formik.values.amount, '0.898')
})

test('fees exceeding the balance produce an unavailable amount, never a positive fallback', async () => {
  state.gas = 2
  await render()
  assert.equal(formik.values.amount, '0')
  assert.equal(formik.values.amountPresetError, 'Not enough ETH for network fees')
})

test('the solver bounds oscillating amount-dependent fees and returns only a covered candidate', async () => {
  const probes = []
  const result = await amountPresets.calculatePresetAmount({ network, token, balance: { amount: 1 }, limit: 10,
    estimateGas: async amount => { probes.push(amount); return { gas: amount > 0.9 ? 0.2 : 0.01, token } },
  })
  assert.equal(result, '0.796')
  assert.equal(probes.length, 2)
})

test('the solver rejects missing balances and gas instead of assuming zero fees', async () => {
  const base = { network, token, balance: { amount: 1 }, limit: 10, estimateGas: async () => undefined }
  await assert.rejects(amountPresets.calculatePresetAmount(base), /network fee/)
  for (const amount of [NaN, Infinity, -1])
    await assert.rejects(amountPresets.calculatePresetAmount({ ...base, balance: { amount } }), /balance/)
})

for (const [mode, amount] of [['min', '0.001'], ['half', '0.4949'], ['max', '0.9898']]) {
  test(`${mode}: USD price changes and display toggles preserve tokens; editing USD exits the preset`, async () => {
    initialValues.amountMode = mode
    state.usdMode = true
    usdStore.setState({ isUsdMode: true, usdAmount: '' })
    await render()
    assert.equal(formik.values.amount, amount)
    for (const price of [1000, 4000]) {
      state.usdPrice = price
      await render()
      assert.equal(formik.values.amount, amount, 'A price drop must not increase tokens to preserve the old USD value')
      assert.equal(Number(usd.usdAmount), Number((Number(amount) * price).toFixed(2)))
    }
    await act(() => usd.handleToggle())
    await act(() => usd.handleToggle())
    assert.equal(formik.values.amountMode, mode)
    assert.equal(formik.values.amount, amount)
    await act(() => usd.handleUsdInputChange({ target: { value: '1000' } }))
    assert.equal(formik.values.amountMode, 'manual')
    assert.equal(formik.values.amount, '0.25')
    assert.equal(formik.values.amountPresetSource, undefined)
  })
}

test('small balances stay plain decimals and cannot be rounded above the available token units', async () => {
  const result = await amountPresets.calculatePresetAmount({ network, token: { ...token, decimals: 9 },
    balance: { amount: 0.0000005 }, limit: 10, estimateGas: async () => ({ token, gas: 0.00000001 }) })
  assert.equal(result, '0.000000489')
})

for (const mode of ['min', 'half', 'max']) {
  for (const price of [1, 4000]) {
    test(`${mode}: changing source token to a $${price} asset preserves the entered USD value`, async () => {
      initialValues.amountMode = mode
      state.usdMode = true
      usdStore.setState({ isUsdMode: true, usdAmount: '' })
      await render()
      const reviewedUsd = usd.usdAmount
      const nextToken = { symbol: price === 1 ? 'USDC' : 'OTHER', decimals: 6, precision: 6, price_in_usd: price }
      // RoutePicker updates fromAsset before the network, without pre-clearing the preset.
      await act(() => formik.setFieldValue('fromAsset', nextToken))
      assert.equal(formik.values.amountMode, 'manual')
      assert.equal(formik.values.amountPresetSource, undefined)
      assert.equal(usd.usdAmount, reviewedUsd)
      assert.ok(Math.abs(Number(formik.values.amount) * price - Number(reviewedUsd)) < 0.005)
    })
  }
}

test('provider fees charged in the transferred token are reserved even on a different native asset', async () => {
  const usdc = { symbol: 'USDC', decimals: 6 }
  const result = await amountPresets.calculatePresetAmount({ network, token: usdc, balance: { amount: 50 }, limit: 100,
    estimateGas: async () => ({ token: usdc, gas: 0.01 }) })
  assert.equal(result, '49.9898')
})

test('a fee paid in another asset does not reduce the transferred token amount', async () => {
  const result = await amountPresets.calculatePresetAmount({ network, token: { symbol: 'USDC', decimals: 6 },
    balance: { amount: 50 }, limit: 20, estimateGas: async () => ({ token, gas: 0.1 }) })
  assert.equal(result, '20')
})

test('the amount lowered by the final check stays visible while live Max resumes', async () => {
  await render()
  state.locked = true
  await render()
  state.preparedDraft = { amountPresetSource: formik.values.amountPresetSource, requested_amount: '0.85' }
  state.revision++; state.locked = false; state.deferred = Promise.withResolvers()
  await render()
  assert.equal(formik.values.amount, '0.85')
  assert.equal(state.draft.amount, '0.85')
  assert.equal(formik.values.amountPresetPending, true)
  await act(async () => { state.deferred.resolve({ token, gas: 0.2 }); await state.deferred.promise })
  assert.equal(formik.values.amount, '0.796')
})

test('tiny fee increases on every RPC read do not turn a valid balance into an error', async () => {
  const native = { ...token, decimals: 18 }
  let latestFee = 0.000001846
  let reads = 0
  const balance = 0.05399312
  const result = await amountPresets.calculatePresetAmount({ network: { ...network, token: native }, token: native,
    balance: { amount: balance }, limit: 10, probeAmount: '0.05399123503545234',
    estimateGas: async () => { reads++; latestFee += 0.000000000001; return { token: native, gas: latestFee } },
  })
  assert.equal(reads, 2)
  assert.ok(Number(result) > 0)
  assert.ok(Number(result) + latestFee <= balance, 'The newest fee is covered')
})

test('large fee increases still reduce the amount before returning an affordable result', async () => {
  let reads = 0
  const result = await amountPresets.calculatePresetAmount({ network, token, balance: { amount: 1 }, limit: 10,
    estimateGas: async () => ({ token, gas: ++reads === 1 ? 0.01 : 0.2, reserve: 0.05 }),
  })
  assert.equal(result, '0.746')
  assert.equal(reads, 3)
  assert.ok(Number(result) + 0.2 + 0.05 <= 1)
})

test('fees that repeatedly exceed the reserve remain blocked with a bounded request count', async () => {
  let reads = 0
  await assert.rejects(amountPresets.calculatePresetAmount({ network, token, balance: { amount: 1 }, limit: 10,
    estimateGas: async () => ({ token, gas: 0.01 * 2 ** reads++ }),
  }), /fees are changing/)
  assert.equal(reads, 4)
})

test('a temporary fee failure retries automatically with the same balance and route', async () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  state.error = new Error('temporary RPC failure')
  await render()
  assert.equal(formik.values.amountPresetError, 'Network fee unavailable')
  state.error = undefined
  await act(async () => {
    for (let i = 0; i < 40 && state.probes.length < 3; i++)
      await new Promise(resolve => setTimeout(resolve, 10))
  })
  assert.equal(formik.values.amountPresetError, undefined)
  assert.equal(formik.values.amount, '0.9898')
  assert.equal(formik.values.amountPresetPending, false)
})

test('balance failures retain their own compact error', async () => {
  state.balanceError = new Error('unavailable')
  await render()
  assert.equal(formik.values.amountPresetError, 'Balance unavailable')
})

for (const mode of ['max', 'half', 'min']) {
  for (const [code, message, displayedMessage] of [
    ['ROUTE_NOT_FOUND_ERROR', 'Route not found', 'Route not found'],
    ['ROUTE_NOT_FOUND_ERROR', 'Rate not available', 'Rate not available'],
    ['PRICE_IMPACT_TOO_HIGH', 'Provider price impact exceeded', 'Price impact too high'],
    ['UNEXPECTED_ERROR', 'Internal error', 'Route not found'],
  ]) {
    for (const shape of ['api', 'axios']) {
      test(`${mode} displays the same ${code}/${message} error as manual input (${shape})`, async () => {
        initialValues.amountMode = mode
        state.renderValidation = true
        state.limitsError = shape === 'axios' ? { response: { data: { error: { code, message } } } } : { code, message }
        const manualError = formValidation.resolveFormValidation({
          values: { ...initialValues, amountMode: 'manual' }, quoteError: state.limitsError,
        })
        assert.equal(manualError.message, displayedMessage)
        await render()
        assert.equal(formik.values.amountPresetError, manualError.message)
        assert.equal(container.querySelector('button').textContent, manualError.message)
        assert.equal(container.querySelector('button').disabled, true)

        state.limitsError = undefined
        await render()
        assert.equal(formik.values.amountPresetError, undefined)
        assert.equal(formik.values.amountPresetPending, false)
      })
    }
  }
}


test('Max preserves the manual-entry quote error when the limits request fails differently', async () => {
  state.renderValidation = true
  state.limit = undefined
  state.minimum = undefined
  state.limitsError = { code: 'ROUTE_NOT_FOUND_ERROR', message: 'Route not found' }
  state.quoteError = { response: { data: { error: { code: 'ROUTE_NOT_FOUND_ERROR', message: 'Rate not available' } } } }
  await render()
  assert.equal(container.querySelector('button').textContent, 'Rate not available')
  await act(() => formik.setValues({ ...formik.values, amountMode: 'manual' }))
  assert.equal(container.querySelector('button').textContent, 'Rate not available')
})

test('50% follows half the spendable balance after fees and route caps, syncing the draft', async () => {
  initialValues.amountMode = 'half'
  await render()
  assert.equal(formik.values.amount, '0.4949')
  assert.equal(state.draft.amountMode, 'half')
  state.balances = [{ ...state.balances[0], amount: 2, request_time: 2 }]
  await render()
  assert.equal(formik.values.amount, '0.9949')
  state.gas = 0.1; state.reserve = 0.2
  await act(async () => { await mutate(key => Array.isArray(key) && key[0] === 'amount-preset') })
  assert.equal(formik.values.amount, '0.849')
  state.limit = 0.8
  await render()
  assert.equal(formik.values.amount, '0.4')
  assert.equal(state.draft.amount, '0.4')
})

test('Min follows rounded-up route minimums and never substitutes an unaffordable lower amount', async () => {
  initialValues.amountMode = 'min'
  await render()
  assert.equal(formik.values.amount, '0.001')
  state.minimum = 0.0020001
  await render()
  assert.equal(formik.values.amount, '0.002001')
  state.balances = [{ ...state.balances[0], amount: 0.001, request_time: 2 }]
  await render()
  assert.equal(formik.values.amount, '0.002001')
  assert.equal(formik.values.amountPresetError, 'Insufficient ETH balance')
  state.minimum = 0.0030001
  await render()
  assert.equal(formik.values.amount, '0.003001')
  assert.equal(state.draft.amount, '0.003001')
  assert.equal(formik.values.amountMode, 'min')
  state.balances = [{ ...state.balances[0], amount: 1, request_time: 3 }]
  await render()
  assert.equal(formik.values.amountPresetError, undefined)
  assert.equal(formik.values.amount, '0.003001')
})

test('a late Max calculation cannot overwrite a newly selected 50% preset', async () => {
  const oldRequest = Promise.withResolvers()
  state.deferred = oldRequest
  await render()
  const newRequest = Promise.withResolvers()
  state.deferred = newRequest
  await act(() => formik.setValues({ ...formik.values, amountMode: 'half', amountPresetPending: true }))
  await act(async () => { newRequest.resolve({ gas: 0.1, token }); await newRequest.promise })
  assert.equal(formik.values.amountMode, 'half')
  assert.equal(formik.values.amount, '0.449')
  await act(async () => { oldRequest.resolve({ gas: 0.01, token }); await oldRequest.promise })
  assert.equal(formik.values.amountMode, 'half')
  assert.equal(formik.values.amount, '0.449')
  assert.equal(state.draft.amount, '0.449')
})

test('50% below the route minimum stays 50% and is blocked without spending more', async () => {
  initialValues.amountMode = 'half'
  state.minimum = 0.6
  await render()
  assert.equal(formik.values.amount, '0.4949')
  assert.equal(formik.values.amountPresetError, 'Minimum is 0.6 ETH')
})

const submitButton = () => container.querySelector('[data-attr="submit-swap"]')
for (const isUsdMode of [false, true]) {
  for (const mode of ['min', 'half', 'max']) {
    test(`${mode}: zero USDC balance has the same button message in ${isUsdMode ? 'USD' : 'token'} mode`, async () => {
      const usdc = { symbol: 'USDC', decimals: 6, price_in_usd: 1 }
      Object.assign(initialValues, { amountMode: mode, fromAsset: usdc,
        amountPresetSource: amountPresets.amountPresetSource(network.name, usdc.symbol, 'wallet', 'source') })
      state.balances = [{ ...state.balances[0], token: usdc.symbol, amount: 0 }]
      state.usdMode = true; state.usdPrice = 1; state.renderValidation = true
      usdStore.setState({ isUsdMode })
      await render()
      assert.equal(submitButton().textContent, 'Insufficient USDC balance')
      assert.equal(submitButton().disabled, true)
      assert.equal(formik.values.amountMode, mode)
      assert.equal(formik.values.amountPresetPending, false)
      assert.equal(state.probes.length, 0, 'an empty source balance does not need a fee request')
      state.balances = [{ ...state.balances[0], amount: 1, request_time: 2 }]
      await render()
      assert.equal(submitButton().textContent, 'Next')
      assert.equal(submitButton().disabled, false)
    })

    test(`${mode}: the fee message identifies the fee token and recovers in ${isUsdMode ? 'USD' : 'token'} mode`, async () => {
      initialValues.amountMode = mode
      state.gas = 2; state.renderValidation = true; state.usdMode = true
      usdStore.setState({ isUsdMode })
      await render()
      assert.equal(submitButton().textContent, 'Not enough ETH for network fees')
      assert.equal(submitButton().disabled, true)
      assert.equal(formik.values.amount, mode === 'min' ? '0.001' : '0')
      state.gas = 0.01
      await act(async () => { await mutate(key => Array.isArray(key) && key[0] === 'amount-preset') })
      assert.equal(submitButton().textContent, 'Next')
      assert.equal(submitButton().disabled, false)
      assert.equal(formik.values.amountMode, mode)
    })
  }

  for (const mode of ['half', 'max']) {
    test(`${mode}: a positive amount below minimum shows the required value in ${isUsdMode ? 'USD' : 'token'} mode`, async () => {
      initialValues.amountMode = mode
      state.minimum = 1.0000001; state.renderValidation = true; state.usdMode = true
      usdStore.setState({ isUsdMode })
      await render()
      assert.equal(submitButton().textContent, isUsdMode ? 'Minimum is $2000.01' : 'Minimum is 1.000001 ETH')
      assert.equal(submitButton().disabled, true)
      const chosenAmount = formik.values.amount
      const probeCount = state.probes.length
      await act(() => usd.handleToggle())
      assert.equal(submitButton().textContent, isUsdMode ? 'Minimum is 1.000001 ETH' : 'Minimum is $2000.01')
      assert.equal(formik.values.amount, chosenAmount)
      assert.equal(formik.values.amountMode, mode)
      assert.equal(state.probes.length, probeCount, 'display changes must not restart fee calculation')
    })
  }
}

test('a positive dust balance rounded to zero is not mislabeled as a network fee problem', async () => {
  initialValues.amountMode = 'half'
  state.balances = [{ ...state.balances[0], amount: 0.000001 }]
  state.gas = 0; state.renderValidation = true
  await render()
  assert.equal(formik.values.amount, '0')
  assert.equal(submitButton().textContent, 'Insufficient ETH balance')
})

test('editing zero after a preset clears its balance error and asks for an amount', async () => {
  state.balances = [{ ...state.balances[0], amount: 0 }]
  state.usdMode = true; state.renderValidation = true
  usdStore.setState({ isUsdMode: true })
  await render()
  assert.equal(submitButton().textContent, 'Insufficient ETH balance')
  await act(() => usd.handleUsdInputChange({ target: { value: '0' } }))
  assert.equal(formik.values.amountMode, 'manual')
  assert.equal(submitButton().textContent, 'Enter an amount')
  assert.equal(submitButton().disabled, true)
})

test('half estimates fees for the half transfer and truncates its smallest token unit', async () => {
  const probes = []
  const amount = await amountPresets.calculatePresetAmount({ mode: 'half', network, token, balance: { amount: 1 }, limit: 10,
    probeAmount: '0.5', estimateGas: async amount => { probes.push(amount); return { gas: amount > 0.6 ? 0.2 : 0.01, token } },
  })
  assert.equal(amount, '0.4949')
  assert.deepEqual(probes, [0.5, 0.4949])
  assert.equal(await amountPresets.calculatePresetAmount({ mode: 'half', network, token, balance: { amount: 0.000003 }, limit: 10,
    estimateGas: async () => ({ gas: 0, token }),
  }), '0.000001')
})

for (const mode of ['min', 'half']) {
  test(`${mode} ignores late fee responses after the swap is frozen`, async () => {
    initialValues.amountMode = mode
    state.deferred = Promise.withResolvers()
    await render()
    const reviewed = formik.values.amount
    state.locked = true
    await render()
    await act(async () => { state.deferred.resolve({ gas: 0.1, token }); await state.deferred.promise })
    assert.equal(formik.values.amount, reviewed)
  })
}

test('stale deposit-address Min keeps its amount and exits live tracking', async () => {
  initialValues.amountMode = 'min'
  initialValues.depositMethod = 'deposit_address'
  initialValues.amountPresetSource = amountPresets.amountPresetSource(network.name, token.symbol)
  state.wallets = []; state.account = undefined
  await render()
  assert.equal(formik.values.amount, '0.5')
  assert.equal(formik.values.amountMode, 'fixed')
  state.minimum = 0.01
  await render()
  assert.equal(formik.values.amount, '0.5')
  assert.equal(state.probes.length, 0)
})

for (const mode of ['min', 'max']) {
  for (const entered of ['0.25', '']) {
    test(`editing exchange ${mode} to ${JSON.stringify(entered)} exits the preset and survives limit refreshes`, async () => {
      initialValues.amountMode = mode
      initialValues.depositMethod = 'deposit_address'
      initialValues.fromExchange = { name: 'exchange' }
      initialValues.amountPresetSource = amountPresets.amountPresetSource(network.name, token.symbol)
      state.exchangeInput = true
      state.wallets = []; state.account = undefined
      await render()
      assert.equal(formik.values.amount, '0.5')
      assert.equal(formik.values.amountMode, 'fixed')
      // Exercise the actual exchange field handler, without pre-clearing preset intent.
      await act(async () => state.changeExchangeAmount({ target: { name: 'amount', type: 'text', value: entered } }))
      assert.equal(formik.values.amount, entered)
      assert.equal(formik.values.amountMode, 'manual')
      assert.equal(formik.values.amountPresetSource, undefined)
      assert.equal(formik.values.amountPresetPending, false)
      assert.equal(formik.values.amountPresetError, undefined)
      state.minimum = 0.1; state.limit = 20
      await render()
      assert.equal(formik.values.amount, entered)
      assert.equal(state.draft.amount, entered)
    })
  }
}


test('Min resumes from the fresh confirmation limits instead of reverting the reviewed draft', async () => {
  initialValues.amountMode = 'min'
  await render()
  state.locked = true
  await render()
  state.preparedDraft = { amountPresetSource: formik.values.amountPresetSource, requested_amount: '0.2' }
  await act(async () => { await mutate('/limits', { data: { min_amount: 0.2, max_amount: 10 } }, { revalidate: false }) })
  state.revision++; state.locked = false
  await render()
  assert.equal(formik.values.amount, '0.2')
  assert.equal(state.draft.amount, '0.2')
})

const { default: MinMax } = loadSource('components/Input/Amount/MinMax.tsx', {
  react: { ...React, default: React }, formik: require('formik'),
  '@/lib/gases/useSWRGas': { default: () => ({ gasData: state.previewGas, isGasLoading: false }) },
  'framer-motion': require('framer-motion'), './helpers': maxHelpers,
  '@layerswap/ui-kit': { Tooltip: ({ children }) => children, TooltipTrigger: ({ children }) => children, TooltipContent: () => null, useHydratedReducedMotion: () => true },
  '@/context/swapAccounts': { useSelectedAccount: () => state.account },
  '@/lib/balances/useBalance': { useBalance: () => ({ balances: state.balances, mutate() {} }) },
  '@/hooks/useWallet': { default: () => ({ wallets: state.wallets }) },
  '@/stores/usdModeStore': { useUsdModeStore: usdStore }, '@/hooks/useUsdTokenSync': { skipNextUsdSync() {} },
  '@/components/utils/formatUsdAmount': require('@layerswap/utils/common'),
  '@layerswap/utils': rounding,
  '@/lib/amountPresets': amountPresets,
})
function PresetButtons() {
  const { values } = useFormikContext()
  return createElement(MinMax, { from: values.from, fromCurrency: values.fromAsset,
    limitsMinAmount: state.minimum, limitsMaxAmount: state.limit,
    depositMethod: values.depositMethod, onActionHover() {} })
}
const { BalanceResolver } = loadSource('lib/balances/balanceResolver.ts', {
  '@/lib/ErrorHandler': { ErrorHandler() {} }, '@layerswap/widget-types': {},
  '../knownIds': require('@layerswap/utils/known-ids'),
  '../widgetTelemetry': { widgetTelemetry: { beginOperation: () => () => {} } },
})
// Use the bundled adapter's actual unsupported gas implementation.
const { TonGasProvider } = loadSource('../../../wallets/adapters/ton/src/tonGasProvider.ts', {
  '@layerswap/utils': { KnownInternalNames: require('@layerswap/utils/known-ids').default },
})
async function setupUnsupportedAdapter(name) {
  const asset = name === 'TON_MAINNET' ? { symbol: 'TON', decimals: 9 } : { symbol: 'USDC', decimals: 6 }
  initialValues.from = { name, token: asset, deposit_methods: ['wallet'] }
  initialValues.fromAsset = asset
  initialValues.amountMode = 'manual'
  initialValues.amountPresetSource = undefined
  state.balances = name === 'TON_MAINNET'
    ? [{ network: name, token: asset.symbol, amount: 10, request_time: 1 }]
    : (await new BalanceResolver().getBalance(initialValues.from, 'source')).balances
  state.minimum = 1
  state.renderPresets = true
  if (name === 'TON_MAINNET') {
    state.providerGas = () => new TonGasProvider().getGas({ network: initialValues.from, token: asset, address: 'source' })
    state.previewGas = await state.providerGas()
  }
}

for (const name of ['TON_MAINNET', 'PARADEX_MAINNET', 'PARADEX_TESTNET']) {
  test(`${name}: supported quick fills remain usable without advertising unavailable live updates`, async () => {
    await setupUnsupportedAdapter(name)
    await render()
    assert.equal(container.querySelector('[data-attr="half-amount"]').disabled, false)
    if (name === 'TON_MAINNET') assert.equal(container.querySelector('[data-attr="max-amount"]').disabled, true)
    for (const mode of name === 'TON_MAINNET' ? ['min', 'half'] : ['min', 'half', 'max']) {
      const button = container.querySelector(`[data-attr="${mode}-amount"]`)
      assert.equal(button.disabled, false)
      await act(() => button.click())
      assert.equal(formik.values.amount, mode === 'min' ? '1' : mode === 'half' ? '5' : '10')
      assert.equal(formik.values.amountMode, 'fixed')
      assert.equal(formik.values.amountPresetSource, undefined)
      assert.equal(formik.values.amountPresetPending, false)
      assert.equal(formik.values.amountPresetError, undefined)
      assert.equal(button.getAttribute('aria-pressed'), null)
      assert.equal(state.probes.length, 0, 'an unsupported live preset must not enter a retry loop')
    }
  })

  test(`${name}: stale live intent is cleared instead of waiting forever for unsupported data`, async () => {
    await setupUnsupportedAdapter(name)
    initialValues.amountMode = 'min'
    initialValues.amountPresetSource = amountPresets.amountPresetSource(name, initialValues.fromAsset.symbol, 'wallet', 'source')
    initialValues.amountPresetPending = true
    initialValues.amountPresetError = 'Network fee unavailable'
    await render()
    assert.equal(formik.values.amount, '0.5')
    assert.equal(formik.values.amountMode, 'fixed')
    assert.equal(formik.values.amountPresetPending, false)
    assert.equal(formik.values.amountPresetError, undefined)
    assert.equal(state.probes.length, 0)
  })
}

test('a temporary missing gas estimate on a supported adapter keeps Min selected and blocked', async () => {
  initialValues.amountMode = 'manual'
  state.renderPresets = true
  state.providerGas = () => undefined
  await render()
  await act(() => container.querySelector('[data-attr="min-amount"]').click())
  assert.equal(formik.values.amountMode, 'min')
  assert.equal(formik.values.amountPresetError, 'Network fee unavailable')
  state.providerGas = undefined
  await act(async () => { await mutate(key => Array.isArray(key) && key[0] === 'amount-preset') })
  assert.equal(formik.values.amountMode, 'min')
  assert.equal(formik.values.amountPresetError, undefined)
  assert.equal(formik.values.amountPresetPending, false)
})

for (const [name, flow, connected] of [
  ['manual transfer', { depositMethod: 'deposit_address' }, true],
  ['manual transfer without a wallet', { depositMethod: 'deposit_address' }, false],
  ['exchange', { depositMethod: 'deposit_address', fromExchange: { name: 'exchange' } }, true],
  ['exchange without a wallet', { depositMethod: 'deposit_address', fromExchange: { name: 'exchange' } }, false],
  ['no transfer method', { depositMethod: undefined }, false],
  ['disconnected wallet', { depositMethod: 'wallet' }, false],
]) {
  for (const mode of ['min', 'half', 'max']) {
    for (const isUsdMode of [false, true]) {
      test(`${name} ${mode} in ${isUsdMode ? 'USD' : 'token'} mode is a one-time shortcut`, async () => {
        Object.assign(initialValues, flow, { amountMode: 'manual', amountPresetSource: undefined })
        state.renderPresets = true
        state.usdMode = true
        usdStore.setState({ isUsdMode, usdAmount: '' })
        if (!connected) { state.wallets = []; state.account = undefined }
        await render()
        assert.equal(container.querySelector('[role="group"]').getAttribute('aria-label'), 'Amount shortcuts')
        const button = container.querySelector(`[data-attr="${mode}-amount"]`)
        assert.equal(button.disabled, false)
        assert.equal(button.getAttribute('aria-pressed'), null, 'One-time buttons do not expose toggle state')
        await act(() => button.click())
        const chosenAmount = mode === 'min' ? '0.001' : mode === 'half' ? (connected ? '0.5' : '5') : '10'
        assert.equal(formik.values.amount, chosenAmount)
        assert.equal(formik.values.amountMode, 'fixed')
        assert.equal(formik.values.amountPresetPending, false)
        assert.equal(formik.values.amountPresetSource, undefined)
        assert.equal(container.querySelector('[aria-pressed="true"]'), null)
        state.minimum = 0.02; state.limit = 0.75; state.gas = 0.3; state.usdPrice = 1000
        state.balances = [{ ...state.balances[0], amount: 0.4, request_time: 2 }]
        await render()
        assert.equal(formik.values.amount, chosenAmount, 'Balance, fee, price and limit changes cannot rewrite a shortcut')
        assert.equal(state.probes.length, 0)
        if (isUsdMode) assert.equal(Number(usd.usdAmount), Number(chosenAmount) * 1000)
        await act(() => usd.handleToggle())
        await act(() => usd.handleToggle())
        assert.equal(formik.values.amount, chosenAmount)
        // Clicking again applies the latest shortcut value; it does not toggle a binding.
        await act(() => button.click())
        assert.equal(formik.values.amount, mode === 'min' ? '0.02' : mode === 'half' ? (connected ? '0.2' : '0.375') : '0.75')
        assert.equal(formik.values.amountMode, 'fixed')
      })
    }
  }
}

for (const flow of [
  { depositMethod: 'deposit_address' },
  { depositMethod: undefined },
  { depositMethod: 'wallet', fromExchange: { name: 'exchange' } },
]) {
  test(`switching to ${JSON.stringify(flow)} cancels a pending wallet preset without changing the amount`, async () => {
    state.deferred = Promise.withResolvers()
    state.usdMode = true
    usdStore.setState({ isUsdMode: true, usdAmount: '' })
    await render()
    const chosenAmount = formik.values.amount
    assert.equal(formik.values.amountPresetPending, true)
    await act(() => formik.setValues({ ...formik.values, ...flow }))
    assert.equal(formik.values.amountMode, 'fixed')
    assert.equal(formik.values.amountPresetPending, false)
    assert.equal(formik.values.amountPresetSource, undefined)
    await act(async () => { state.deferred.resolve({ gas: 0.1, token }); await state.deferred.promise })
    state.usdPrice = 1000; state.limit = 0.3
    await render()
    assert.equal(formik.values.amount, chosenAmount)
    assert.equal(state.draft.amount, chosenAmount)
    assert.equal(Number(usd.usdAmount), Number(chosenAmount) * 1000)
    await act(() => formik.setValues({ ...formik.values, depositMethod: 'wallet', fromExchange: undefined }))
    assert.equal(formik.values.amountMode, 'fixed', 'Returning to a wallet must not silently re-enable the preset')
    assert.equal(formik.values.amount, chosenAmount)
  })
}

test('editing a fixed shortcut in USD restores ordinary USD entry behavior', async () => {
  initialValues.amountMode = 'fixed'
  initialValues.depositMethod = 'deposit_address'
  initialValues.amountPresetSource = undefined
  state.usdMode = true
  usdStore.setState({ isUsdMode: true, usdAmount: '' })
  await render()
  await act(() => usd.handleUsdInputChange({ target: { value: '100' } }))
  assert.equal(formik.values.amountMode, 'manual')
  assert.equal(formik.values.amount, '0.05')
  state.usdPrice = 1000
  await render()
  assert.equal(formik.values.amount, '0.1')
  assert.equal(usd.usdAmount, '100')
})

test('rejected USD edits keep Max telemetry; only accepted input records manual', async () => {
  state.usdMode = true; usdStore.setState({ isUsdMode: true }); await render()
  const amount = formik.values.amount
  const unmount = widgetTelemetry.mount(widgetTelemetry.createFlow({ source_network: network.name, source_token: token.symbol }))
  const wrapper = document.createElement('div'); wrapper.setAttribute('data-ls-form', 'cross-chain')
  const input = document.createElement('input'); input.name = 'amount'; wrapper.append(input); document.body.append(wrapper)
  try {
    widgetTelemetry.interaction('set_max_amount', 'click', true)
    for (const value of ['1.234', '1.2.3', 'x']) {
      input.value = value
      captureWidgetInteraction({ target: input, type: 'change' })
      await act(() => usd.handleUsdInputChange({ target: { value } }))
      assert.equal(formik.values.amount, amount)
      assert.equal(formik.values.amountMode, 'max')
      assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'max')
    }
    input.value = '1.23'
    captureWidgetInteraction({ target: input, type: 'change' })
    await act(() => usd.handleUsdInputChange({ target: { value: '1.23' } }))
    assert.equal(formik.values.amountMode, 'manual')
    assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'manual')
  } finally { wrapper.remove(); unmount() }
})

test('wallet and deposit-method changes clear input telemetry without changing manual/USD behavior', async () => {
  state.renderTelemetry = true; state.usdMode = true
  usdStore.setState({ isUsdMode: true }); await render()
  const amount = formik.values.amount
  widgetTelemetry.interaction('set_max_amount', 'click', true)
  assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'max')
  state.account = { ...state.account, address: 'wallet-B' }; await render()
  assert.equal(formik.values.amountMode, 'manual', 'existing wallet-switch behavior is unchanged')
  assert.equal(formik.values.amount, amount)
  assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'unknown')
  state.usdPrice = 1000; await render()
  assert.equal(Number(formik.values.amount), Number(amount) * 2, 'existing manual USD conversion still follows price changes')
  assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'unknown')
  await act(() => usd.handleUsdInputChange({ target: { value: '2.00' } }))
  assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'manual')
  const editedAmount = formik.values.amount
  await act(() => formik.setFieldValue('depositMethod', 'deposit_address', false))
  assert.equal(formik.values.amount, editedAmount)
  assert.equal(widgetTelemetry.amountInputMethod({ step: 'form_submitted' }), 'unknown')
})


test('a maximum fee exhausting the balance uses the network fee message', async () => {
  state.maxFee = 2
  await render()
  assert.equal(formik.values.amount, '0')
  assert.equal(formik.values.amountPresetError, 'Not enough ETH for network fees')
})
