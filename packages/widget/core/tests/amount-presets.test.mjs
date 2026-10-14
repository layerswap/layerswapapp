import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import { createRequire } from 'node:module'
import React, { act, createElement, createContext, StrictMode } from 'react'
import { Formik, useFormikContext } from 'formik'
import { JSDOM } from 'jsdom'
import { loadSource, amountPresets } from './helpers/source.mjs'

const require = createRequire(import.meta.url)
const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true }))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
const { createRoot } = await import('react-dom/client')
const { default: useSWR, SWRConfig, useSWRConfig } = await import('swr')
const state = {}
const SwapDataStateContext = createContext(null)
const SwapDataUpdateContext = createContext(null)
const { default: Controller } = loadSource('components/Pages/Swap/Form/AmountPresetController.tsx', {
  react: React, formik: require('formik'), swr: { default: useSWR },
  '@/context/swap': { SwapDataStateContext, SwapDataUpdateContext },
  '@/context/swapAccounts': { useSelectedAccount: () => state.account },
  '@/hooks/useWallet': { default: () => ({ wallets: state.wallets }) },
  '@/hooks/useFee': { transformFormValuesToQuoteArgs: v => v, useQuoteData: () => {
    const { data } = useSWR('/limits', null)
    return { maxAllowedAmount: data?.data?.max_amount ?? state.limit, minAllowedAmount: data?.data?.min_amount ?? state.minimum, limitsError: state.limitsError }
  } },
  '@/lib/balances/useBalance': { useBalance: () => ({ balances: state.balances, error: state.balanceError }) },
  '@/lib/amountPresets': amountPresets,
  '@/lib/resolvers/resolverService': { resolverService: { getGasResolver: () => ({ getGas: async ({ amount }) => {
    state.probes.push(amount)
    if (state.deferred) return state.deferred.promise
    if (state.error) throw state.error
    return { gas: state.gas, reserve: state.reserve, token }
  } }) } },
})
const token = { symbol: 'ETH', decimals: 6, price_in_usd: 2000 }
const network = { name: 'ETHEREUM_MAINNET', token }
const usdStore = require('zustand').create(set => ({ isUsdMode: true, usdAmount: '',
  setUsdAmount: usdAmount => set({ usdAmount }), toggleMode: () => set(s => ({ isUsdMode: !s.isUsdMode })),
}))
const { useUsdTokenSync } = loadSource('hooks/useUsdTokenSync.ts', {
  react: React, '@/lib/amountPresets': amountPresets, '@/stores/usdModeStore': { useUsdModeStore: usdStore },
})
const { default: ExchangeAmountField } = loadSource('components/Input/Amount/ExchangeAmountField.tsx', {
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
    fromCurrency: token, amount: values.amount, amountMode: values.amountMode, setFieldValue })
  return null
}
let root, container, formik, mutate, initialValues, config
const updates = { syncAmountPresetDraft: values => { state.draft = values; return true } }
function Probe() {
  formik = useFormikContext()
  mutate = useSWRConfig().mutate
  return createElement(React.Fragment, null, createElement(Controller), state.usdMode ? createElement(UsdProbe) : null,
    state.exchangeInput ? createElement(ExchangeAmountField) : null)
}
const render = () => act(async () => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: config },
    createElement(SwapDataStateContext.Provider, { value: { amountPresetLocked: state.locked, amountPresetRevision: state.revision, swapBasicData: state.preparedDraft } },
      createElement(SwapDataUpdateContext.Provider, { value: updates },
        createElement(Formik, { initialValues, onSubmit() {} }, createElement(Probe))))))))
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  Object.assign(state, { account: { id: 'wallet', address: 'source' }, wallets: [{ id: 'wallet' }],
    balances: [{ amount: 1, network: network.name, token: 'ETH', request_time: 1 }], gas: 0.01, reserve: 0,
    usdMode: false, exchangeInput: false, usdPrice: 2000, limit: 10, minimum: 0.001, probes: [], locked: false, revision: 0, preparedDraft: undefined, deferred: undefined, error: undefined, balanceError: undefined, limitsError: undefined })
  initialValues = { amountMode: 'max', amountPresetSource: amountPresets.amountPresetSource(network.name, 'ETH', 'wallet', 'source'),
    amount: '0.5', from: network, fromAsset: token, to: { name: 'BASE_MAINNET' }, toAsset: token,
    destination_address: 'dest', depositMethod: 'wallet' }
  config = { provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false, errorRetryInterval: 10 }
})
afterEach(async () => { await act(() => root.unmount()); container.remove() })
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
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
  assert.match(formik.values.amountPresetError, /Insufficient balance/)
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

for (const [field, message] of [['balanceError', 'Balance unavailable'], ['limitsError', 'Route limits unavailable']]) {
  test(`${field} has its own compact error, without blaming a different service`, async () => {
    state[field] = new Error('unavailable')
    await render()
    assert.equal(formik.values.amountPresetError, message)
  })
}


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
  assert.equal(formik.values.amountPresetError, 'Insufficient balance')
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
  assert.equal(formik.values.amountPresetError, 'Below minimum amount')
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

test('deposit-address Min tracks route limits without requesting wallet balances or gas', async () => {
  initialValues.amountMode = 'min'
  initialValues.depositMethod = 'deposit_address'
  initialValues.amountPresetSource = amountPresets.amountPresetSource(network.name, token.symbol)
  state.wallets = []; state.account = undefined
  await render()
  assert.equal(formik.values.amount, '0.001')
  state.minimum = 0.01
  await render()
  assert.equal(formik.values.amount, '0.01')
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
      assert.equal(formik.values.amount, mode === 'min' ? '0.001' : '10')
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
