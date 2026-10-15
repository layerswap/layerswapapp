import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import { createRequire } from 'node:module'
import React, { act, createElement, StrictMode } from 'react'
import { Formik, useFormikContext } from 'formik'
import { JSDOM } from 'jsdom'
import { create } from 'zustand'
import { createSwapContext } from './helpers/swap-context.mjs'
import { loadSource, amountPresets } from './helpers/source.mjs'

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
  '@/lib/balances/useBalance': { useBalance: () => ({ balances: state.balances }) },
  '@/lib/amountPresets': amountPresets,
  '@/lib/resolvers/resolverService': { resolverService: { getGasResolver: () => ({ getGas: async () => ({ gas: 0.0000001, token }) }) } },
})
const usdStore = create(set => ({ isUsdMode: false, usdAmount: '', setUsdAmount: usdAmount => set({ usdAmount }) }))
const { useUsdTokenSync } = loadSource('hooks/useUsdTokenSync.ts', {
  react: React, '@/lib/amountPresets': amountPresets, '@/stores/usdModeStore': { useUsdModeStore: usdStore },
})
const { default: Summary } = loadSource('components/Pages/Swap/Withdraw/Summary/index.tsx', {
  '@/context/swap': context,
  './Summary': { default: props => createElement('span', { 'aria-label': 'Selected preset' }, props.amountPreset ?? '') },
  '@/lib/apiClients/layerSwapApiClient': { TransactionType: { Input: 'input', Output: 'output' } },
  '@/lib/address/Address': {}, '@/lib/knownIds': { default: { Exchanges: {} } },
  '@/context/settings': { useInitialSettings: () => ({}) },
  '@/context/swapAccounts': { useSelectedAccount: () => state.account },
  '@/lib/amountPresets': amountPresets,
})
let root, container, formik, data, updates, initialValues, config
function Probe() {
  formik = useFormikContext()
  data = context.useSwapDataState()
  updates = context.useSwapDataUpdate()
  useUsdTokenSync({ fromCurrency: formik.values.fromAsset, amount: formik.values.amount,
    amountMode: formik.values.amountMode, setFieldValue: formik.setFieldValue,
    quote: { source_token: { ...token, price_in_usd: state.price } } })
  return createElement(React.Fragment, null, createElement(Controller), data.swapBasicData ? createElement(Summary) : null)
}
const render = () => act(async () => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: config }, createElement(context.SwapDataProvider, null,
    createElement(Formik, { key: state.formKey, initialValues, onSubmit() {} }, createElement(Probe)))))))
const badge = () => container.querySelector('[aria-label="Selected preset"]').textContent
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
    balances: [{ amount: 0.00182643, network: source.name, token: token.symbol, request_time: 1 }] })
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
      assert.equal(badge(), mode)
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
      assert.equal(badge(), mode)
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
    assert.equal(badge(), mode)
  })
  test(`${mode} cannot change the amount when a remounted form belongs to an already created swap`, async () => {
    initialValues.amountMode = mode
    await render(); await openReview()
    await act(() => updates.setSwapId('created'))
    const before = data.swapBasicData.requested_amount
    await remountForm(); await decreaseBalance()
    assert.equal(data.amountPresetLocked, true)
    assert.equal(data.swapBasicData.requested_amount, before)
    assert.equal(badge(), '')
  })
}

test('manual amounts stay fixed across a remount and external transfer', async () => {
  initialValues.amountMode = 'manual'; initialValues.amountPresetSource = undefined
  await render(); await openReview()
  const before = data.swapBasicData.requested_amount
  await remountForm(); await decreaseBalance()
  assert.equal(data.swapBasicData.requested_amount, before)
  assert.equal(formik.values.amountMode, 'manual')
  assert.equal(badge(), '')
})

test('restoring a draft never applies its preset to a different funding account', async () => {
  await render(); await openReview()
  state.account = { ...state.account, address: 'different-source' }
  await remountForm()
  assert.equal(formik.values.amountMode, 'manual')
  assert.equal(data.swapBasicData.amountMode, 'manual')
  assert.equal(badge(), '')
})

test('a restored preset waits for a pending wallet operation before resuming balance updates', async () => {
  await render(); await openReview()
  const before = data.swapBasicData.requested_amount
  let release
  await act(() => { release = updates.acquireWalletExecution() })
  await remountForm(); await decreaseBalance()
  assert.equal(data.amountPresetLocked, true)
  assert.equal(data.swapBasicData.requested_amount, before)
  assert.equal(badge(), '')
  await act(() => release())
  assert.ok(Number(data.swapBasicData.requested_amount) < Number(before))
  assert.equal(data.swapBasicData.requested_amount, formik.values.amount)
  assert.equal(badge(), 'max')
})
