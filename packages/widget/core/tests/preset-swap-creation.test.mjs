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
const context = createSwapContext({
  Client: class {
    async CreateSwapAsync(params) {
      state.created.push(params)
      return { data: { swap: { id: 'created', source_address: 'source' }, deposit_actions: state.depositActions } }
    }
  },
  getSwapId: () => undefined, getAccount: () => state.account,
  stores,
  swr: { default: () => ({}), useSWRConfig: () => ({ mutate: async (key, response) => { state.publishedLimits.push({ key, response }) } }) },
  overrides: {
    '@/stores/contractAddressStore': { useContractAddressStore: () => ({ checkContractStatus: async () => ({ sourceIsContract: false }) }) },
    '@/lib/preparePresetAmount': { startPresetPreparation: async (...args) => {
      state.prepares++
      state.prepareArgs.push(args)
      // The confirmation check estimates live; the post-creation check supplies the deposit fee.
      return { calculate: (gasFloor, estimateGas) => {
        state.calculations.push({ gasFloor, estimateGas })
        return estimateGas ? state.verify(gasFloor, estimateGas) : state.preparation.promise
      } }
    } },
    '@/lib/depositActionGas': { estimateDepositActionGas: async (...args) => {
      state.depositGasArgs.push(args)
      return state.depositGas
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
  Object.assign(state, { account: { id: 'wallet', address: 'source' }, created: [], prepares: 0, prepareArgs: [], calculations: [],
    preparation: Promise.withResolvers(), verification: Promise.withResolvers(), limits: undefined, publishedLimits: [],
    depositActions: undefined, depositGas: undefined, depositGasArgs: [] })
  state.verify = () => state.verification.promise
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

test('a changed final Max stops before creation and proposes the new amount without touching the draft', async () => {
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
  assert.equal(data.swapBasicData.requested_amount, '0.9', 'the reviewed amount stays until the user adjusts')
  assert.deepEqual(data.presetRevisionProposal, { amount: '0.85', message: amountPresets.AMOUNT_ADJUSTMENT_MESSAGE, floor: undefined })
  assert.equal(data.quoteIsLoading, false)
  assert.equal(data.amountPresetLocked, false)
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

test('creation passes the recorded deposit fee floor to the confirmation check only within its scope', async () => {
  const floor = { gas: 0.2, token }
  const scope = amountPresets.amountPresetGasFloorScope(values.amountPresetSource, network.name, token.symbol)
  await act(() => updates.recordDepositGasFloor({ scope, gas: floor }))
  assert.deepEqual(data.depositGasFloor, { scope, gas: floor })
  state.preparation.resolve(values.amount)
  await act(async () => { await updates.createSwap(values, {}) })
  assert.equal(state.prepares, 1)
  assert.deepEqual(state.calculations[0].gasFloor, floor)
  assert.equal(state.calculations[0].estimateGas, undefined, 'the confirmation check estimates live')

  const elsewhere = { ...values, to: { ...network, name: 'OTHER_MAINNET' } }
  state.preparation = Promise.withResolvers(); state.preparation.resolve(values.amount)
  await act(async () => { updates.setSubmitedFormValues(elsewhere); await updates.createSwap(elsewhere, {}) })
  assert.equal(state.calculations[1].gasFloor, undefined, 'a floor recorded for another destination must not apply')

  await act(() => updates.clearDepositGasFloor())
  assert.equal(data.depositGasFloor, undefined)
})

const depositActions = [{ type: 'transfer', step: 'deposit', status: 'action_required', to_address: 'deposit', amount: 0.9, call_data: '0x9afe9145' }]

test('a deposit fee that cuts Max by more than the guard proposes the amount and withholds the floor', async () => {
  const depositGas = { gas: 0.2, maxFee: 0.25, token }
  Object.assign(state, { depositActions, depositGas })
  state.preparation.resolve(values.amount)
  let failure
  await act(() => { failure = updates.createSwap(values, {}).then(() => assert.fail('the wallet must not open'), error => error) })
  await act(async () => { state.verification.resolve('0.65'); await failure })
  const error = await failure
  assert.ok(error instanceof amountPresets.AmountPresetChangedError)
  assert.match(error.message, /network fee for this swap is higher/)
  assert.equal(state.created.length, 1, 'the deposit transaction only exists once the swap does')
  assert.equal(state.depositGasArgs[0][0], depositActions)
  assert.equal(state.depositGasArgs[0][2], 'source')
  const verification = state.calculations[1]
  assert.equal(verification.gasFloor, undefined)
  assert.deepEqual(await verification.estimateGas(0.9), depositGas, 'the check prices the real deposit, not another plain transfer')
  const scope = amountPresets.amountPresetGasFloorScope(values.amountPresetSource, network.name, token.symbol)
  assert.equal(data.depositGasFloor, undefined, 'a recorded floor would make the live preset rewrite the amount before the user accepts')
  assert.deepEqual(data.presetRevisionProposal, { amount: '0.65', message: error.message, floor: { scope, gas: depositGas } })
  assert.equal(data.swapBasicData.requested_amount, '0.9', 'the reviewed amount stays on screen')
  assert.equal(data.swapBasicData.amountMode, 'max')
  assert.equal(data.quoteIsLoading, false)
  assert.equal(data.amountPresetLocked, false, 'the draft is open for the adjusted confirmation')
  assert.equal(data.swapId, undefined)
  let applied
  await act(() => { applied = updates.applyPresetRevision() })
  assert.equal(applied, '0.65')
  assert.deepEqual(data.depositGasFloor, { scope, gas: depositGas }, 'accepting records the real fee for every later preset on this route')
  assert.equal(data.swapBasicData.requested_amount, '0.65')
  assert.equal(data.presetRevisionProposal, undefined)
})

test('a small deposit fee shortfall replaces the swap with the affordable amount in the same click', async () => {
  const depositGas = { gas: 0.004, token }
  Object.assign(state, { depositActions, depositGas })
  state.preparation.resolve(values.amount)
  state.verify = async () => '0.895'
  let created
  await act(async () => { created = await updates.createSwap(values, {}) })
  assert.equal(created.swap.id, 'created')
  assert.deepEqual(state.created.map(request => request.amount), ['0.9', '0.895'], 'the replacement carries the affordable amount')
  assert.equal(state.calculations.length, 3, 'confirmation, the deposit fee check, and one recheck of the replacement')
  assert.equal(state.depositGasArgs[1][1].amount, '0.895', 'the replacement is priced at its own amount')
  assert.equal(data.swapBasicData.requested_amount, '0.895')
  assert.equal(data.swapBasicData.amountPresetPending, undefined, 'an applied revision needs no second review')
  assert.equal(data.presetRevisionProposal, undefined, 'the summary and the wallet show the final amount; nothing to adjust')
  assert.deepEqual(data.depositGasFloor.gas, depositGas, 'an applied reduction records the real fee')
  assert.equal(data.amountPresetLocked, true, 'the replacement freezes the draft like any created swap')
})

test('a tiny send applies a shortfall worth under a cent even when it exceeds one percent', async () => {
  const priced = { ...token, price_in_usd: 1800 }
  const tiny = { ...values, amount: '0.0001', fromAsset: priced, toAsset: priced }
  await act(() => updates.setSubmitedFormValues(tiny))
  Object.assign(state, { depositActions, depositGas: { gas: 0.000002, token: priced } })
  state.preparation.resolve(tiny.amount)
  state.verify = async () => '0.000098'
  let created
  await act(async () => { created = await updates.createSwap(tiny, {}) })
  assert.equal(created.swap.id, 'created')
  assert.deepEqual(state.created.map(request => request.amount), ['0.0001', '0.000098'])
  assert.equal(data.presetRevisionProposal, undefined)
})

test('a replacement that still falls short is proposed instead of a third swap', async () => {
  const depositGas = { gas: 0.004, token }
  Object.assign(state, { depositActions, depositGas })
  state.preparation.resolve(values.amount)
  const verifications = ['0.895', '0.891']
  state.verify = async () => verifications.shift()
  let failure
  await act(() => { failure = updates.createSwap(values, {}).then(() => assert.fail('a second shortfall must not create again'), error => error) })
  const error = await failure
  assert.ok(error instanceof amountPresets.AmountPresetChangedError)
  assert.deepEqual(state.created.map(request => request.amount), ['0.9', '0.895'])
  assert.equal(data.swapBasicData.requested_amount, '0.895', 'the applied first reduction stays; the second is only proposed')
  assert.equal(data.presetRevisionProposal.amount, '0.891')
  assert.equal(data.presetRevisionProposal.floor.gas, depositGas)
  assert.equal(data.swapBasicData.amountPresetPending, undefined)
  assert.equal(data.amountPresetLocked, false)
})

test('a small change found by the confirmation check is sent without another review', async () => {
  state.preparation.resolve('0.897')
  let created
  await act(async () => { created = await updates.createSwap(values, {}) })
  assert.equal(created.swap.id, 'created')
  assert.deepEqual(state.created.map(request => request.amount), ['0.897'])
  assert.equal(data.swapBasicData.requested_amount, '0.897')
  assert.equal(data.presetRevisionProposal, undefined)
  assert.equal(data.amountPresetLocked, true)
})

test('a fresh attempt or a new submission clears the proposal', async () => {
  let rejected
  await act(() => { rejected = assert.rejects(updates.createSwap(values, {}), amountPresets.AmountPresetChangedError) })
  await act(async () => { state.preparation.resolve('0.85'); await rejected })
  assert.ok(data.presetRevisionProposal)
  await act(() => updates.startFreshSwapAttempt())
  assert.equal(data.presetRevisionProposal, undefined)
  state.preparation = Promise.withResolvers()
  await act(() => { rejected = assert.rejects(updates.createSwap(values, {}), amountPresets.AmountPresetChangedError) })
  await act(async () => { state.preparation.resolve('0.85'); await rejected })
  assert.ok(data.presetRevisionProposal)
  await act(() => updates.setSubmitedFormValues(values))
  assert.equal(data.presetRevisionProposal, undefined)
})

test('a deposit fee that still fits creates the swap and only records the floor', async () => {
  const depositGas = { gas: 0.05, token }
  Object.assign(state, { depositActions, depositGas })
  state.preparation.resolve(values.amount)
  state.verification.resolve(values.amount)
  let created
  await act(async () => { created = await updates.createSwap(values, {}) })
  assert.equal(created.swap.id, 'created')
  assert.equal(state.calculations.length, 2)
  assert.equal(data.depositGasFloor.gas, depositGas)
  assert.equal(data.amountPresetLocked, true, 'creation freezes the reviewed amount as before')
})

test('min presets record the deposit fee but never revise their fixed amount', async () => {
  values.amountMode = 'min'
  await act(() => updates.setSubmitedFormValues(values))
  Object.assign(state, { depositActions, depositGas: { gas: 5, token } })
  state.preparation.resolve(values.amount)
  await act(async () => { await updates.createSwap(values, {}) })
  assert.equal(state.created.length, 1)
  assert.equal(state.calculations.length, 1, 'a minimum cannot be reduced to fit a fee')
  assert.equal(data.depositGasFloor.gas.gas, 5)
})

test('an unavailable deposit fee estimate never blocks the wallet', async () => {
  Object.assign(state, { depositActions, depositGas: undefined })
  state.preparation.resolve(values.amount)
  await act(async () => { await updates.createSwap(values, {}) })
  assert.equal(state.created.length, 1)
  assert.equal(state.calculations.length, 1)
  assert.equal(data.depositGasFloor, undefined)
})
