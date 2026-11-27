import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import React, { act, createElement } from 'react'
import { JSDOM } from 'jsdom'
import { create } from 'zustand'
import { createSwapContext } from './helpers/swap-context.mjs'
import { loadSource, amountPresets } from './helpers/source.mjs'
import { createPresetPreparation } from './helpers/preset-preparation.mjs'

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
  './amountPresets': amountPresets,
})
const context = createSwapContext({
  Client: class {
    async CreateSwapAsync(params) {
      state.created.push(params)
      if (state.request) await state.request(params)
      return { data: { swap: { id: state.created.length === 1 ? 'created' : `created-${state.created.length}`, source_address: 'source', requested_amount: params.amount }, deposit_actions: state.depositActions } }
    }
  },
  getSwapId: () => undefined, getAccount: () => state.account,
  stores,
  swr: { default: () => ({}) },
  overrides: {
    './callbackProvider': { useCallbacks: () => ({
      onSwapCreate: response => state.announced.push(response.swap.id),
      onSwapLifecycle: event => state.lifecycle.push(event),
    }) },
    '@/stores/swapRouteHistoryStore': { recordSwapRouteHistory: response => state.history.push(response.swap.id) },
    '@/stores/contractAddressStore': { useContractAddressStore: () => ({ checkContractStatus: async () => ({ sourceIsContract: false }) }) },
    '@/lib/preparePresetAmount': { startPresetPreparation: async (...args) => {
      state.prepares++
      if (state.prepare) {
        return state.prepare(...args)
      }
      // The confirmation check estimates live; the post-creation check supplies the deposit fee.
      return { calculate: (gasFloor, estimateGas) => {
        return estimateGas ? state.verify(gasFloor, estimateGas) : state.preparation.promise
      } }
    } },
    '@/lib/depositActionGas': { estimateDepositActionGas: async () => state.depositGas },
    '@/hooks/useWithdrawalProvider': { useWithdrawalProvider: () => state.provider },
    '@/helpers/gasless': { isGaslessCapableRoute: () => false },
    '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
    '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
    '@/lib/swapLifecycle': { lifecycleContextFromForm: values => ({ requestedAmount: values.amount }) },
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
  Object.assign(state, { account: { id: 'wallet', address: 'source' }, created: [], announced: [], lifecycle: [], history: [], prepares: 0,
    preparation: Promise.withResolvers(), verification: Promise.withResolvers(),
    depositActions: undefined, depositGas: undefined, provider: undefined, request: undefined, prepare: undefined })
  state.verify = () => state.verification.promise
  values = { from: network, to: network, fromAsset: token, toAsset: token, amount: '0.9', destination_address: 'destination',
    depositMethod: 'wallet', amountMode: 'max', amountPresetSource: amountPresets.amountPresetSource(network.name, token.symbol, 'wallet', 'source') }
  await render()
  await act(() => { updates.setSubmitedFormValues(values); updates.setSwapViewMounted(true) })
})
afterEach(async () => { await act(() => root.unmount()); container.remove() })
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
  }
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

test('a changed final Max stops before creation and proposes the new amount without touching the draft', async () => {
  let pending, rejected
  await act(() => {
    pending = updates.createSwap(values, {})
    rejected = assert.rejects(pending, amountPresets.AmountPresetChangedError)
    assert.equal(updates.syncAmountPresetDraft({ ...values, amount: '0.8' }), false, 'Synchronous lock rejects late refreshes before rerender')
  })
  assert.equal(data.amountPresetLocked, true)
  assert.equal(updates.canAdjustAmount(), false)
  assert.deepEqual(state.lifecycle.map(event => event.step), ['swap_creation_started'])
  await act(async () => { state.preparation.resolve('0.85'); await rejected })
  assert.deepEqual(state.lifecycle.map(event => event.step), ['swap_creation_started', 'swap_creation_failed'])
  assert.equal(state.lifecycle.at(-1).outcome, 'blocked')
  assert.equal(state.lifecycle.at(-1).reasonCode, 'amount_adjustment_required')
  assert.equal(state.created.length, 0)
  assert.equal(data.swapBasicData.requested_amount, '0.9', 'the reviewed amount stays until the user adjusts')
  assert.deepEqual(data.presetRevisionProposal, { amount: '0.85', message: amountPresets.AMOUNT_ADJUSTMENT_MESSAGE, floor: undefined })
  assert.equal(data.quoteIsLoading, false)
  assert.equal(data.amountPresetLocked, true, 'the proposal freezes live changes')
  let applied
  await act(() => { applied = updates.applyPresetRevision() })
  assert.equal(applied, '0.85')
  assert.equal(data.swapBasicData.requested_amount, '0.85')
  assert.equal(data.presetRevisionProposal, undefined)
  assert.equal(updates.applyPresetRevision(), undefined, 'nothing is left to apply')
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
  const previousRevision = data.amountPresetRevision
  await act(() => updates.startFreshSwapAttempt())
  assert.equal(data.amountPresetRevision, previousRevision + 1, 'fresh attempts must invalidate cached preset calculations')
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

for (const [mode, fresh] of [['min', '1'], ['half', '0.4']]) {
  test(`${mode}: a changed final amount is proposed and requires adjustment before creation`, async () => {
    values.amountMode = mode
    await act(() => updates.setSubmitedFormValues(values))
    let rejected
    await act(() => { rejected = assert.rejects(updates.createSwap(values, {}), amountPresets.AmountPresetChangedError) })
    assert.equal(data.amountPresetLocked, true)
    await act(async () => { state.preparation.resolve(fresh); await rejected })
    assert.equal(state.created.length, 0)
    assert.equal(data.swapBasicData.requested_amount, values.amount)
    assert.equal(data.presetRevisionProposal.amount, fresh)
    assert.equal(data.swapBasicData.amountMode, mode)
    assert.equal(data.amountPresetLocked, true)
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

const depositActions = [{ type: 'transfer', step: 'deposit', status: 'action_required', to_address: 'deposit', amount: 0.9 }]

for (const plainGas of [0.005, 0.012]) {
  test(`Half stays at its reviewed amount with a ${plainGas} plain fee and a 0.012 deposit fee`, async () => {
    values = { ...values, amountMode: 'half', amount: '0.49745' }
    state.prepare = createPresetPreparation({
      token, balance: 1, gas: plainGas, limits: { min_amount: 0.497, max_amount: 2 },
    }).startPresetPreparation
    Object.assign(state, { depositActions, depositGas: { gas: 0.012, token } })
    await act(() => updates.setSubmitedFormValues(values))
    await act(() => updates.createSwap(values, {}))
    assert.deepEqual(state.created.map(request => request.amount), ['0.49745'])
    assert.equal(data.swapBasicData.requested_amount, '0.49745')
    assert.equal(data.presetRevisionProposal, undefined)
    assert.deepEqual(state.announced, ['created'])
  })
}

test('failed Min retries wait for the floor to expire, then accept cheaper fees on the same route and account', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 })
  values = { ...values, amountMode: 'min', amount: '0.009' }
  state.prepare = createPresetPreparation({
    token, balance: 0.01, gas: 0.0001, limits: { min_amount: 0.009, max_amount: 2 },
  }).startPresetPreparation
  Object.assign(state, { depositActions, depositGas: { gas: 0.0012, token } })
  await act(() => updates.setSubmitedFormValues(values))
  await act(() => assert.rejects(updates.createSwap(values, {}), /Not enough ETH for network fees/))
  assert.equal(state.created.length, 1)
  assert.deepEqual(state.announced, [])
  assert.equal(data.amountPresetLocked, false)
  const failedFloor = data.depositGasFloor
  assert.equal(failedFloor.expiresAt, Date.now() + amountPresets.FAILED_MIN_GAS_FLOOR_TTL_MS)

  state.depositGas = { gas: 0.0004, token }
  await act(() => assert.rejects(updates.createSwap(values, {}), /Not enough ETH for network fees/))
  assert.equal(state.created.length, 1, 'immediate retries cannot create abandoned API swaps')
  assert.equal(data.depositGasFloor, failedFloor, 'a blocked retry must not extend the deadline')
  await act(() => t.mock.timers.tick(amountPresets.FAILED_MIN_GAS_FLOOR_TTL_MS - 1))
  assert.equal(data.depositGasFloor, failedFloor)
  await act(() => t.mock.timers.tick(1))
  assert.equal(data.depositGasFloor, undefined, 'expiry must publish state so live presets recalculate')

  await act(() => updates.createSwap(values, {}))
  assert.deepEqual(state.created.map(request => request.amount), ['0.009', '0.009'])
  assert.deepEqual(state.announced, ['created-2'])
  assert.deepEqual(state.history, ['created-2'])
  assert.equal(data.depositGasFloor.gas.gas, 0.0004)
  assert.equal(data.depositGasFloor.expiresAt, undefined)
  assert.equal(data.swapBasicData.requested_amount, '0.009')
})

test('a refreshed deposit fee replaces a failed Min floor without being cleared by its old deadline', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 })
  const scope = amountPresets.amountPresetGasFloorScope(values.amountPresetSource, network.name, token.symbol)
  const gas = { gas: 0.0012, token }
  await act(() => updates.recordDepositGasFloor({ scope, gas, expiresAt: Date.now() + amountPresets.FAILED_MIN_GAS_FLOOR_TTL_MS }))
  await act(() => updates.recordDepositGasFloor({ scope, gas }))
  await act(() => t.mock.timers.tick(amountPresets.FAILED_MIN_GAS_FLOOR_TTL_MS))
  assert.deepEqual(data.depositGasFloor, { scope, gas }, 'even an unchanged fee replaces the expiring observation')
})

test('a large deposit fee keeps the reviewed amount until the proposal is accepted', async () => {
  const gas = { gas: 0.2, token }
  Object.assign(state, { depositActions, depositGas: gas })
  state.preparation.resolve('0.897')
  state.verification.resolve('0.65')
  await act(() => assert.rejects(updates.createSwap(values, {}), amountPresets.AmountPresetChangedError))
  assert.equal(data.swapBasicData.requested_amount, '0.9')
  assert.equal(data.depositGasFloor, undefined)
  assert.equal(data.presetRevisionProposal.amount, '0.65')
  assert.equal(state.lifecycle.at(-1).outcome, 'blocked')
  assert.equal(state.lifecycle.at(-1).reasonCode, 'amount_adjustment_required')
  assert.deepEqual(state.announced, [])
  assert.deepEqual(state.history, [])
  await act(() => updates.applyPresetRevision())
  assert.equal(data.swapBasicData.requested_amount, '0.65')
  assert.equal(data.depositGasFloor.gas, gas)
  assert.equal(data.presetRevisionProposal, undefined)
})

test('a small deposit fee shortfall publishes only the affordable replacement', async () => {
  Object.assign(state, { depositActions, depositGas: { gas: 0.004, token } })
  state.preparation.resolve(values.amount)
  const floor = { scope: amountPresets.amountPresetGasFloorScope(values.amountPresetSource, network.name, token.symbol), gas: { gas: 0.01, token } }
  await act(() => updates.recordDepositGasFloor(floor))
  let verifications = 0
  state.verify = async (gasFloor, estimateGas) => {
    verifications++
    assert.equal(gasFloor, undefined, 'both the candidate and replacement must use their own exact fee without the old floor')
    assert.equal(await estimateGas(), state.depositGas)
    return '0.895'
  }
  await act(() => updates.createSwap(values, {}))
  assert.equal(verifications, 2)
  assert.deepEqual(state.created.map(request => request.amount), ['0.9', '0.895'])
  assert.equal(data.swapBasicData.requested_amount, '0.895')
  assert.equal(data.presetRevisionProposal, undefined)
  assert.deepEqual(state.announced, ['created-2'])
  assert.deepEqual(state.history, ['created-2'])
  assert.deepEqual(state.lifecycle.map(event => event.step), ['swap_creation_started', 'swap_created'])
  assert.equal(state.lifecycle.at(-1).requestedAmount, '0.895')
})

test('a replacement that still falls short proposes an amount instead of creating a third swap', async () => {
  Object.assign(state, { depositActions, depositGas: { gas: 0.004, token } })
  state.preparation.resolve(values.amount)
  const amounts = ['0.895', '0.891']
  state.verify = async () => amounts.shift()
  await act(() => assert.rejects(updates.createSwap(values, {}), amountPresets.AmountPresetChangedError))
  assert.deepEqual(state.created.map(request => request.amount), ['0.9', '0.895'])
  assert.equal(data.swapBasicData.requested_amount, '0.9')
  assert.equal(data.depositGasFloor, undefined)
  assert.equal(data.presetRevisionProposal.amount, '0.891')
  assert.deepEqual(state.announced, [])
})

test('a failed request does not commit a small amount revision', async () => {
  state.preparation.resolve('0.897')
  state.request = async () => { throw new Error('API unavailable') }
  await act(() => assert.rejects(updates.createSwap(values, {}), /API unavailable/))
  assert.equal(data.swapBasicData.requested_amount, '0.9')
  assert.equal(data.presetRevisionProposal, undefined)
  assert.equal(state.lifecycle.at(-1).outcome, 'failed')
})

test('confirmation can apply a reduction worth under a cent even when it exceeds one percent', async () => {
  values = { ...values, amount: '0.0001', fromAsset: { ...token, price_in_usd: 1800 } }
  await act(() => updates.setSubmitedFormValues(values))
  state.preparation.resolve('0.000098')
  await act(() => updates.createSwap(values, {}))
  assert.deepEqual(state.created.map(request => request.amount), ['0.000098'])
  assert.equal(data.swapBasicData.requested_amount, '0.000098')
  assert.equal(data.presetRevisionProposal, undefined)
})

test('Min rejects a deposit fee the account cannot afford', async () => {
  values.amountMode = 'min'
  Object.assign(state, { depositActions, depositGas: { gas: 0.1, token } })
  state.preparation.resolve(values.amount)
  state.verify = (_floor, estimateGas) => amountPresets.calculatePresetAmount({
    network, token, balance: { amount: 0.905 }, limit: 2, minimum: 0.9,
    mode: 'min', probeAmount: values.amount, preserveAmount: true, estimateGas,
  })
  await act(() => assert.rejects(updates.createSwap(values, {}), /Not enough ETH for network fees/))
  assert.equal(data.swapBasicData.requested_amount, '0.9')
  assert.deepEqual(state.announced, [])
})

test('an account change during the deposit check discards the proposal and its fee floor', async () => {
  Object.assign(state, { depositActions, depositGas: { gas: 0.2, token } })
  state.preparation.resolve(values.amount)
  let rejected
  await act(() => { rejected = assert.rejects(updates.createSwap(values, {}), /source account changed/) })
  state.account = { ...state.account, address: 'another-account' }
  await render()
  await act(async () => { state.verification.resolve('0.65'); await rejected })
  assert.equal(data.presetRevisionProposal, undefined)
  assert.equal(data.depositGasFloor, undefined)
  assert.deepEqual(state.announced, [])
})

for (const stage of ['preparation', 'deposit fee']) {
  test(`provider withdrawals require confirmation even for a small ${stage} reduction`, async () => {
    state.provider = { id: 'provider' }
    Object.assign(state, { depositActions, depositGas: { gas: 0.004, token } })
    await render()
    state.preparation.resolve(stage === 'preparation' ? '0.895' : values.amount)
    state.verification.resolve('0.895')
    await act(() => assert.rejects(updates.createSwap(values, {}), amountPresets.AmountPresetChangedError))
    assert.equal(data.swapBasicData.requested_amount, '0.9')
    assert.equal(data.presetRevisionProposal.amount, '0.895')
    assert.deepEqual(state.announced, [])
  })
}
