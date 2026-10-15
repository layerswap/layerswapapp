import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import React, { act, createElement } from 'react'
import { JSDOM } from 'jsdom'
import { create } from 'zustand'
import { createSwapContext } from './helpers/swap-context.mjs'
import { loadSource, amountPresets } from './helpers/source.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.example' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true }))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
const { createRoot } = await import('react-dom/client')
const state = {}
const transactionStore = create(() => ({ swapTransactions: {}, pendingSubmissions: {}, stepTransactions: {} }))
const stores = {
  useSwapTransactionStore: transactionStore,
  useGaslessAuthorizationStore: create(() => ({ authorizations: {} })),
  useDepositSignatureStore: create(() => ({ signatures: {}, removeDepositSignature() {} })),
}
const swapCreation = loadSource('lib/swapCreation.ts', {
  '@layerswap/widget-types': { getErrorOccurrenceId: () => 'test-error' },
  '@/lib/ErrorHandler': { ErrorHandler: () => {} },
  './swapLifecycle': { lifecycleErrorDetails: () => ({}) },
})
const { preparePresetAmount } = loadSource('lib/preparePresetAmount.ts', {
  '@layerswap/widget-types': { usesDepository: () => false },
  '@/hooks/useFee': { buildLimitsUrl: () => '/limits' },
  './apiClients/layerSwapApiClient': { default: class { async fetcher() { return { data: state.limits } } } },
  './extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
  './extendedRoutes/transforms': {}, '@/stores/balanceStore': {}, './resolvers/resolverService': {},
  './amountPresets': amountPresets,
})
const context = createSwapContext({
  Client: class {
    async CreateSwapAsync(params) {
      state.created.push(params)
      return { data: { swap: { id: 'created', source_address: 'source' } } }
    }
  },
  getSwapId: () => undefined, getAccount: () => state.account,
  stores,
  swr: { default: () => ({}), useSWRConfig: () => ({ mutate: async (key, response) => { state.publishedLimits.push({ key, response }) } }) },
  overrides: {
    '@/stores/contractAddressStore': { useContractAddressStore: () => ({ checkContractStatus: async () => ({ sourceIsContract: false }) }) },
    '@/lib/preparePresetAmount': { preparePresetAmount: async (...args) => {
      state.prepares++
      return state.limits ? preparePresetAmount(...args) : state.preparation.promise
    } },
    '@/helpers/gasless': { isGaslessCapableRoute: () => false },
    '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
    '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
    '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
    '@/lib/swapCreation': swapCreation,
  },
})
const token = { symbol: 'ETH', decimals: 18 }
const network = { name: 'BASE_MAINNET', token }
let root, container, data, updates, values
function Probe() {
  data = context.useSwapDataState(); updates = context.useSwapDataUpdate()
  return createElement('button', { disabled: !updates.canAdjustAmount() }, 'Adjust amount')
}
const render = key => act(() => root.render(createElement(context.SwapDataProvider, { key }, createElement(Probe))))
beforeEach(async () => {
  transactionStore.setState({ swapTransactions: {}, pendingSubmissions: {} })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  Object.assign(state, { account: { id: 'wallet', address: 'source' }, created: [], prepares: 0, preparation: Promise.withResolvers(), limits: undefined, publishedLimits: [] })
  values = { from: network, to: network, fromAsset: token, toAsset: token, amount: '0.9', destination_address: 'destination',
    depositMethod: 'wallet', amountMode: 'max', amountPresetSource: amountPresets.amountPresetSource(network.name, token.symbol, 'wallet', 'source') }
  await render()
  await act(() => { updates.setSubmitedFormValues(values); updates.setSwapViewMounted(true) })
})

for (const mode of ['min', 'max']) {
  for (const firstSubmit of [true, false]) {
    test(`${mode}: direct exchange submission succeeds ${firstSubmit ? 'before any draft has rendered' : 'after changing source routes'}`, async () => {
      state.account = undefined
      await render(firstSubmit ? 'fresh' : undefined)
      if (firstSubmit) assert.equal(data.swapBasicData, undefined)
      const source = firstSubmit ? network : { ...network, name: 'OTHER_MAINNET' }
      const submitted = { ...values, from: source, amountMode: mode, depositMethod: 'deposit_address', fromExchange: { name: 'exchange' },
        amountPresetSource: amountPresets.amountPresetSource(source.name, token.symbol) }
      state.preparation.resolve(submitted.amount)
      await act(async () => {
        // FormWrapper submits and creates in one event, without an intervening render.
        updates.setSubmitedFormValues(submitted)
        await updates.createSwap(submitted, {})
      })
      assert.equal(state.prepares, 0)
      assert.equal(state.created.length, 1)
      assert.equal(state.created[0].source_network, source.name)
      assert.equal(state.created[0].amount, submitted.amount)
      assert.equal(state.created[0].use_deposit_address, true)
    })
  }
}

test('non-wallet submissions discard stale preset metadata without changing the submitted amount', async () => {
  const submitted = { ...values, depositMethod: 'deposit_address',
    amountPresetSource: amountPresets.amountPresetSource('OTHER_MAINNET', token.symbol),
    amountPresetPending: true, amountPresetError: 'old error', amountPresetBalance: 1 }
  await act(async () => {
    updates.setSubmitedFormValues(submitted)
    await updates.createSwap(submitted, {})
  })
  assert.equal(state.prepares, 0)
  assert.equal(state.created[0].amount, submitted.amount)
  assert.equal(data.swapBasicData.amountMode, 'fixed')
  assert.equal(data.swapBasicData.amountPresetPending, false)
  assert.equal(data.swapBasicData.amountPresetSource, undefined)
  assert.equal(data.swapBasicData.amountPresetError, undefined)
  assert.equal(data.swapBasicData.amountPresetBalance, undefined)
  await act(() => updates.syncAmountPresetDraft({ ...submitted, amount: '0.1' }))
  assert.equal(data.swapBasicData.requested_amount, submitted.amount)
})

test('an unresolved provider submission disables adjustment until its marker is cleared', async () => {
  await act(() => updates.setSwapId('existing'))
  assert.equal(container.querySelector('button').disabled, false)
  await act(() => transactionStore.setState({ pendingSubmissions: { existing: true, other: true } }))
  assert.equal(updates.canAdjustAmount(), false)
  assert.equal(container.querySelector('button').disabled, true, 'marker updates must reach the disabled view')
  assert.equal(data.swapId, 'existing')
  await act(() => transactionStore.setState({ pendingSubmissions: { other: true } }))
  assert.equal(updates.canAdjustAmount(), true, 'a definitively unsubmitted attempt can be adjusted')
  assert.equal(container.querySelector('button').disabled, false)
})

test('a provider submission arriving between render and click prevents detaching the swap', async () => {
  await act(() => updates.setSwapId('existing'))
  const guardAtRender = updates.canAdjustAmount
  await act(() => {
    transactionStore.setState({ pendingSubmissions: { existing: true } })
    assert.equal(guardAtRender(), false, 'read the marker synchronously, before a rerender')
    if (guardAtRender()) updates.startFreshSwapAttempt()
  })
  assert.equal(data.swapId, 'existing')
})
afterEach(async () => { await act(() => root.unmount()); container.remove() })
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
  }
})

test('a changed final Max stops before creation and shows the revised draft for review', async () => {
  let pending, rejected
  await act(() => {
    pending = updates.createSwap(values, {})
    rejected = assert.rejects(pending, amountPresets.AmountPresetChangedError)
    assert.equal(updates.syncAmountPresetDraft({ ...values, amount: '0.8' }), false, 'Synchronous lock rejects late refreshes before rerender')
  })
  assert.equal(data.amountPresetLocked, true)
  assert.equal(updates.canAdjustAmount(), false)
  await act(async () => { state.preparation.resolve('0.85'); await rejected })
  assert.equal(state.created.length, 0)
  assert.equal(data.swapBasicData.requested_amount, '0.85')
  assert.equal(data.quoteIsLoading, true, 'A new amount must wait for its quote')
  assert.equal(data.amountPresetLocked, false)
})

test('unchanged Max creates exactly the reviewed amount and remains frozen after creation', async () => {
  let pending
  await act(() => { pending = updates.createSwap(values, {}) })
  await act(async () => { state.preparation.resolve('0.900'); await pending })
  assert.equal(state.created.length, 1)
  assert.equal(state.created[0].amount, '0.9')
  assert.equal('amountMode' in state.created[0], false, 'Max is local intent, not an API field')
  assert.equal(data.amountPresetLocked, true, 'Creation must freeze before the caller attaches the swap id')
  await act(() => { assert.equal(updates.syncAmountPresetDraft({ ...values, amount: '0.7' }), false) })
  assert.equal(data.swapBasicData.requested_amount, '0.9')
})

test('an account change during preparation cannot create a swap for the previous account', async () => {
  let rejected
  await act(() => { rejected = assert.rejects(updates.createSwap(values, {}), /source account changed/) })
  state.account = { ...state.account, address: 'other' }
  await render()
  await act(async () => { state.preparation.resolve('0.9'); await rejected })
  assert.equal(state.created.length, 0)
})

test('failed preparation unlocks the draft without creating a swap', async () => {
  let rejected
  await act(() => { rejected = assert.rejects(updates.createSwap(values, {}), /balance unavailable/) })
  await act(async () => { state.preparation.reject(new Error('balance unavailable')); await rejected })
  assert.equal(data.amountPresetLocked, false)
  assert.equal(data.swapBasicData.requested_amount, '0.9')
  assert.equal(state.created.length, 0)
})

test('manual amounts preserve the existing creation path', async () => {
  await act(async () => { await updates.createSwap({ ...values, amountMode: 'manual' }, {}) })
  assert.equal(state.prepares, 0)
  assert.equal(state.created[0].amount, '0.9')
})

test('created swaps reject live draft syncing until an explicit fresh attempt', async () => {
  await act(() => { updates.setSwapId('existing') })
  assert.equal(data.amountPresetLocked, true)
  assert.equal(updates.syncAmountPresetDraft({ ...values, amount: '0.4' }), false)
  assert.equal(data.swapBasicData.requested_amount, '1')
  await act(() => updates.startFreshSwapAttempt())
  assert.equal(data.amountPresetLocked, false)
  assert.equal(data.swapId, undefined)
})

test('a larger fresh maximum never increases the confirmed transfer or forces a review loop', async () => {
  let pending
  await act(() => { pending = updates.createSwap(values, {}) })
  await act(async () => { state.preparation.resolve('1.1'); await pending })
  assert.equal(state.created.length, 1)
  assert.equal(state.created[0].amount, '0.9')
})

test('wallet execution locks Max synchronously before the next render', async () => {
  await act(() => {
    updates.setWalletActionExecuting(true)
    assert.equal(updates.canAdjustAmount(), false)
    assert.equal(updates.syncAmountPresetDraft({ ...values, amount: '0.3' }), false)
  })
  assert.equal(data.amountPresetLocked, true)
  assert.equal(data.swapBasicData.requested_amount, '0.9')
  await act(() => updates.setWalletActionExecuting(false))
  assert.equal(data.amountPresetLocked, false)
})

test('provider execution leases cannot release each other or the regular wallet lock', async () => {
  let releaseFirst, releaseRetry
  await act(() => {
    releaseFirst = updates.acquireWalletExecution()
    releaseRetry = updates.acquireWalletExecution()
    assert.equal(updates.canAdjustAmount(), false)
    releaseRetry()
    releaseRetry() // A cleanup must be idempotent.
    updates.setWalletActionExecuting(false)
    assert.equal(updates.canAdjustAmount(), false)
    assert.equal(updates.syncAmountPresetDraft({ ...values, amount: '0.3' }), false)
  })
  assert.equal(data.amountPresetLocked, true)
  await act(() => {
    updates.setWalletActionExecuting(true)
    releaseFirst()
    assert.equal(updates.canAdjustAmount(), false)
  })
  await act(() => updates.setWalletActionExecuting(false))
  assert.equal(data.amountPresetLocked, false)
  assert.equal(updates.canAdjustAmount(), true)
})

for (const limit of [0.5, 2]) {
  test(`exchange shortcuts never revise the submitted amount when route cap changes to ${limit}`, async () => {
    state.account = undefined
    state.limits = { min_amount: 0.1, max_amount: limit }
    const submitted = { ...values, amountMode: 'fixed', depositMethod: 'deposit_address', fromExchange: { name: 'exchange' } }
    await act(async () => {
      updates.setSubmitedFormValues(submitted)
      await updates.createSwap(submitted, {})
    })
    assert.equal(state.prepares, 0, 'Fixed amounts use the ordinary API validation path')
    assert.deepEqual(state.created.map(request => request.amount), ['0.9'])
    assert.deepEqual(state.publishedLimits, [])
  })
}

for (const [mode, fresh] of [['min', '1'], ['half', '0.4']]) {
  test(`${mode}: a changed final amount updates the draft and requires confirmation before creation`, async () => {
    values.amountMode = mode
    await act(() => updates.setSubmitedFormValues(values))
    let rejected
    await act(() => { rejected = assert.rejects(updates.createSwap(values, {}), amountPresets.AmountPresetChangedError) })
    assert.equal(data.amountPresetLocked, true)
    await act(async () => { state.preparation.resolve(fresh); await rejected })
    assert.equal(state.created.length, 0)
    assert.equal(data.swapBasicData.requested_amount, fresh)
    assert.equal(data.swapBasicData.amountMode, mode)
    assert.equal(data.quoteIsLoading, true)
    assert.equal(data.amountPresetLocked, false)
  })
  test(`${mode}: unchanged confirmation creates exactly the reviewed amount and freezes the draft`, async () => {
    values.amountMode = mode
    await act(() => updates.setSubmitedFormValues(values))
    let pending
    await act(() => { pending = updates.createSwap(values, {}) })
    await act(async () => { state.preparation.resolve(values.amount); await pending })
    assert.equal(state.created[0].amount, values.amount)
    assert.equal(data.amountPresetLocked, true)
    assert.equal(updates.syncAmountPresetDraft({ ...values, amount: '0.1' }), false)
  })
}
