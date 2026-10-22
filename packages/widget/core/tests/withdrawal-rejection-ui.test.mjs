import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { userRejectedError } from '@layerswap/wallet-core/errors'
import { createSwapContext } from './helpers/swap-context.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.test', pretendToBeVisual: true })
const previous = Object.getOwnPropertyDescriptors(globalThis)
const surfaces = {
  window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, SVGElement: dom.window.SVGElement,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true,
}
for (const [key, value] of Object.entries(surfaces)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
const fixtureUrl = 'data:text/javascript,' + encodeURIComponent(`
  export const state = { events: [], errors: [] }
  export const useSwapDataState = () => ({ swapDetails: state.swapDetails, depositActionsResponse: state.depositActions })
  export const useSwapDataUpdate = () => ({ reportWalletActionFeedback() { return () => {} }, setSwapId(id) { state.selectedSwapId = id },
    setWalletActionExecuting(value) { state.executionUpdates.setWalletActionExecuting(value); state.executionLocks.push(value) },
    acquireWalletExecution() {
      const release = state.executionUpdates.acquireWalletExecution()
      state.executionLocks.push(true)
      return () => { release(); state.executionLocks.push(false) }
    },
    startFreshSwapAttempt() { state.freshAttempts++ },
    createSwap: (...args) => { state.creations++; return state.createSwap(...args) },
    mutateSwap: async response => { state.reconciled.push(response); state.swapDetails = response.data.swap },
  })
  export const useSettingsState = () => ({ networks: [], sourceRoutes: [] })
  export const useInitialSettings = () => ({})
  export const useWalletWithdrawalState = () => ({ onWalletWithdrawalSuccess() { state.successes++; state.onSuccess?.() } })
  export const useSelectedAccount = () => ({ id: 'wallet', address: state.sourceAddress ?? 'source', provider: state.provider })
  export default () => ({ wallets: [{ id: 'wallet', address: 'source', providerName: 'test-wallet' }] })
  export const useTransfer = () => ({ executeTransfer: async (...args) => {
    state.transfers.push(args)
    return state.executeTransfer(...args)
  } })
  export const useCallbacks = () => ({ onSwapLifecycle: event => state.events.push(event) })
  export const ErrorHandler = event => state.errors.push(event)
`)
const apiUrl = 'data:text/javascript,' + encodeURIComponent(`
  import { state } from ${JSON.stringify(fixtureUrl)}
  export const BackendTransactionStatus = { Pending: 'pending', Failed: 'failed', Completed: 'completed', Initiated: 'initiated' }
  export const TransactionStatus = { Pending: 'pending', Failed: 'failed', Completed: 'completed' }
  export const TransactionType = { Input: 'input', Output: 'output', Refuel: 'refuel', Refund: 'refund' }
  export default class {
    GetSwapAsync(...args) { state.refreshes.push(args); return state.getSwap(...args) }
    GetDepositActionsAsync(...args) { state.actionRefreshes.push(args); return state.getDepositActions(...args) }
  }
`)
const mocked = ['/context/swap', '/context/withdrawalContext', '/context/swapAccounts', '/context/settings',
  '/hooks/useWallet', '/hooks/useTransfer', '/context/callbackProvider', '/lib/ErrorHandler',
  '/lib/apiClients/layerSwapApiClient']
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return { url: apiUrl, shortCircuit: true }
  if ((/\/use(?:Hyperliquid|Polymarket)Withdrawal\.js$/.test(context.parentURL ?? '') || context.parentURL?.endsWith('/executeProviderWithdrawal.js')) && mocked.some(path => specifier.endsWith(path))) {
    return { url: fixtureUrl, shortCircuit: true }
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
  return nextResolve(specifier, context)
} })
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of Object.keys(surfaces)) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})
const { state } = await import(fixtureUrl)
const { createRoot } = await import('react-dom/client')
// Keep the real execution context alive while withdrawal views close/reopen.
const executionContext = createSwapContext({
  Client: class {}, getSwapId: () => undefined, getAccount: () => undefined,
  swr: { default: () => ({}) },
})
function ExecutionProbe() {
  state.executionUpdates = executionContext.useSwapDataUpdate()
  return null
}
Object.defineProperty(state, 'executing', { get: () => !state.executionUpdates.canAdjustAmount() })
const { useHyperliquidWithdrawal } = await import('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/Hyperliquid/useHyperliquidWithdrawal.js')
const { usePolymarketWithdrawal } = await import('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/Polymarket/usePolymarketWithdrawal.js')
const stores = await import('../dist/esm/stores/swapTransactionStore.js')
const { useSwapTransactionStore } = stores
const phases = await import('../dist/esm/components/utils/resolveSwapPhase.js')
const { getExplorerUrl } = await import('../dist/esm/lib/address/explorerUrl.js')
const { WalletExecutionTransition } = await import('../dist/esm/components/Pages/Swap/Withdraw/Presentation/WalletExecutionTransition.js')
const providerExecutionUrl = new URL('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/executeProviderWithdrawal.js', import.meta.url)
const { executeProviderWithdrawal } = await import(providerExecutionUrl)
const swapBasicData = {
  requested_amount: '1', source_network: { name: 'source' }, destination_network: { name: 'destination' },
  source_token: { decimals: 6 }, destination_token: {}, destination_address: 'destination',
}

let unsubscribeStore, executionRoot
beforeEach(async () => {
  useSwapTransactionStore.setState(useSwapTransactionStore.getInitialState(), true)
  Object.assign(state, {
    events: [], errors: [], transfers: [], published: [], successes: 0, error: undefined, sourceAddress: 'source', provider: undefined,
    refreshes: [], actionRefreshes: [], reconciled: [], freshAttempts: 0, creations: 0, selectedSwapId: 'swap-1',
    swapDetails: { id: 'swap-1' }, onSuccess: undefined, executionLocks: [],
    depositActions: [{ type: 'transfer', to_address: 'deposit', call_data: '0x', amount_in_base_units: '1000000' }],
    executeTransfer: async params => { params.onSubmissionStateChange('preparing'); throw state.error },
    createSwap: async () => assert.fail('unexpected swap creation'),
    getSwap: async id => ({ data: { swap: { id, status: 'user_transfer_pending', transactions: [] }, deposit_actions: state.depositActions } }),
    getDepositActions: async () => ({ data: state.depositActions }),
  })
  unsubscribeStore = useSwapTransactionStore.subscribe((current, previous) => {
    for (const [id, transaction] of Object.entries(current.swapTransactions)) {
      if (transaction.hash && transaction.hash !== previous.swapTransactions[id]?.hash) {
        state.published.push([id, transaction.hash])
      }
    }
  })
  executionRoot = createRoot(document.createElement('div'))
  await act(() => executionRoot.render(createElement(executionContext.SwapDataProvider, null, createElement(ExecutionProbe))))
})
afterEach(async () => { unsubscribeStore(); await act(() => executionRoot.unmount()) })

test('a saved flow kind does not trigger reconciliation before the first withdrawal', async () => {
  useSwapTransactionStore.getState().setSwapTransactionKind('swap-1', 'wallet-transfer')
  const hash = await executeProviderWithdrawal({
    swapId: 'swap-1', sourceAddress: 'source',
    prepare: async () => 'prepared',
    execute: async prepared => { assert.equal(prepared, 'prepared'); return 'submitted-hash' },
    onReconcile: () => assert.fail('identity alone does not prove a submission'),
  })
  assert.equal(hash, 'submitted-hash')
  assert.deepEqual(state.refreshes, [])
  assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].kind, 'wallet-transfer')
})

async function reloadTransactionStore() {
  const persisted = localStorage.getItem('swapTransactions')
  useSwapTransactionStore.setState(useSwapTransactionStore.getInitialState(), true)
  localStorage.setItem('swapTransactions', persisted)
  await useSwapTransactionStore.persist.rehydrate()
}

for (const stage of ['preparation', 'signing']) {
  test(`reloading during ${stage} permits retry without persisting an unsubmitted withdrawal`, async () => {
    const paused = Promise.withResolvers()
    const entered = Promise.withResolvers()
    let submissions = 0
    const abandoned = executeProviderWithdrawal({
      swapId: 'swap-1', sourceAddress: 'source', onReconcile: async () => {},
      prepare: async () => {
        if (stage === 'preparation') {
          entered.resolve()
          await paused.promise
        }
        return 'prepared'
      },
      execute: async (_, onSubmissionStateChange) => {
        onSubmissionStateChange('preparing')
        entered.resolve()
        await paused.promise
        onSubmissionStateChange('submitting')
        submissions++
        return 'abandoned-hash'
      },
    }).catch(error => error)
    try {
      await entered.promise
      assert.equal(submissions, 0)
      assert.deepEqual(JSON.parse(localStorage.getItem('swapTransactions')).state.pendingSubmissions, {})

      const retry = {
        swapId: 'swap-1', sourceAddress: 'source', onReconcile: async () => assert.fail('nothing was submitted'),
        prepare: async () => 'fresh',
        execute: async (prepared, onSubmissionStateChange) => {
          assert.equal(prepared, 'fresh')
          onSubmissionStateChange('preparing')
          onSubmissionStateChange('submitting')
          submissions++
          return 'retry-hash'
        },
      }
      await assert.rejects(executeProviderWithdrawal(retry), /already in progress/)
      assert.equal(submissions, 0, 'another controller cannot submit while the original session is active')

      // A page reload rehydrates durable state and creates a fresh execution module.
      await reloadTransactionStore()
      const reopened = await import(`${providerExecutionUrl.href}?reload=${stage}`)
      assert.equal(await reopened.executeProviderWithdrawal(retry), 'retry-hash')
      assert.equal(submissions, 1)
      assert.deepEqual(state.refreshes, [])
      assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'retry-hash')
      assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
    } finally {
      paused.reject(new Error('Original page closed before submission'))
      await abandoned
    }
  })
}

test('concurrent retries cannot both reconcile a failed withdrawal and submit again', async () => {
  const reconciliation = Promise.withResolvers()
  useSwapTransactionStore.getState().setSwapTransaction('swap-1', 'failed-withdrawal')
  useSwapTransactionStore.getState().markSubmissionPending('swap-1')
  state.getSwap = () => reconciliation.promise
  let preparations = 0
  let submissions = 0
  const retry = {
    swapId: 'swap-1', sourceAddress: 'source', onReconcile: async () => {},
    prepare: async () => { preparations++; return 'fresh' },
    execute: async () => { submissions++; return 'retry-hash' },
  }
  const pending = executeProviderWithdrawal(retry)
  try {
    await assert.rejects(executeProviderWithdrawal(retry), /already in progress/)
    assert.equal(state.refreshes.length, 1)
    assert.equal(preparations, 0)
    assert.equal(submissions, 0)
    reconciliation.resolve({ data: { swap: { id: 'swap-1', transactions: [
      { type: 'input', status: 'failed', transaction_hash: 'failed-withdrawal' },
    ] } } })
    assert.equal(await pending, 'retry-hash')
    assert.equal(preparations, 1)
    assert.equal(submissions, 1)
  } finally {
    reconciliation.resolve({ data: { swap: { id: 'swap-1' } } })
    await pending.catch(() => {})
  }
})

test('an unrelated backend failure cannot clear a pending submission without a recorded transaction', async () => {
  useSwapTransactionStore.getState().markSubmissionPending('swap-1')
  state.getSwap = async id => ({ data: { swap: { id, transactions: [
    { type: 'input', status: 'failed', transaction_hash: 'old-failed-withdrawal' },
  ] } } })
  await assert.rejects(executeProviderWithdrawal({
    swapId: 'swap-1', sourceAddress: 'source', onReconcile: async () => {},
    prepare: async () => assert.fail('the unknown submission must remain blocked'),
    execute: async () => assert.fail('the unknown submission must remain blocked'),
  }), { header: 'Withdrawal status unknown' })
  assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-1'], true)
})

test('a successful hashless provider response resumes after reload without another wallet request', async () => {
  const request = {
    swapId: 'swap-1', sourceAddress: 'source', onReconcile: async () => {},
    prepare: async () => 'prepared',
    execute: async (_, onSubmissionStateChange) => {
      onSubmissionStateChange('preparing')
      return ''
    },
  }
  assert.equal(await executeProviderWithdrawal(request), '')
  const receipt = useSwapTransactionStore.getState().swapTransactions['swap-1']
  assert.equal(receipt.providerSubmissionAccepted, true)
  assert.equal(receipt.hash, undefined)
  assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
  await reloadTransactionStore()
  state.getSwap = async () => assert.fail('a successful submission does not depend on backend indexing')
  assert.equal(await executeProviderWithdrawal({
    ...request,
    prepare: async () => assert.fail('the accepted request must be retained'),
    execute: async () => assert.fail('never send the withdrawal twice'),
  }), '')
  assert.deepEqual(state.refreshes, [])
  assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
  assert.deepEqual(useSwapTransactionStore.getState().swapTransactions['swap-1'], receipt)
})

test('recording a transaction clears its pending submission atomically and preserves other swaps', () => {
  const store = useSwapTransactionStore.getState()
  store.markSubmissionPending('swap-1')
  store.markSubmissionPending('swap-2')
  assert.deepEqual(useSwapTransactionStore.getState().swapTransactions, {})
  const transitions = []
  const unsubscribe = useSwapTransactionStore.subscribe(current => transitions.push({
    pending: current.pendingSubmissions['swap-1'], transaction: current.swapTransactions['swap-1'],
  }))
  try {
    store.setSwapTransaction('swap-1', 'hash')
    assert.equal(transitions.length, 1)
    assert.equal(transitions[0].pending, undefined)
    assert.equal(transitions[0].transaction.hash, 'hash')
    assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, { 'swap-2': true })
    const receipts = JSON.parse(localStorage.getItem('swapTransactions')).state
    assert.deepEqual(receipts, {
      swapTransactions: { 'swap-1': { kind: 'transaction', hash: 'hash', timestamp: transitions[0].transaction.timestamp } },
      stepTransactions: {},
      pendingSubmissions: { 'swap-2': true },
    })
  } finally {
    unsubscribe()
  }
})

test('transaction cleanup does not discard an unresolved provider submission', () => {
  const store = useSwapTransactionStore.getState()
  store.markSubmissionPending('swap-1')
  store.markSubmissionPending('swap-2')
  store.removeSwapTransaction('swap-1')
  assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-1'], true)
  store.clearPendingSubmission('swap-1')
  assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, { 'swap-2': true })
})

test('existing persisted transactions hydrate with an empty pending submission map', async () => {
  const transaction = { hash: 'existing-hash', timestamp: 123 }
  localStorage.setItem('swapTransactions', JSON.stringify({
    state: { swapTransactions: { 'swap-1': transaction } }, version: 0,
  }))
  await useSwapTransactionStore.persist.rehydrate()
  assert.deepEqual(useSwapTransactionStore.getState().swapTransactions, { 'swap-1': { kind: 'transaction', ...transaction } })
  assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
  useSwapTransactionStore.getState().markSubmissionPending('swap-2')
  assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-2'], true)
})

async function mountWithdrawal(useWithdrawal, props = {}) {
  let result
  let active = true
  function Probe() {
    result = useWithdrawal({ swapId: 'swap-1', swapBasicData, refuel: false, ...props }, active)
    return null
  }
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Probe)))
  return { get result() { return result }, rerender: () => act(() => root.render(createElement(Probe))), setActive: value => { active = value; return act(() => root.render(createElement(Probe))); }, unmount: () => act(async () => root.unmount()) }
}

for (const [useWithdrawal, providerType] of [
  [useHyperliquidWithdrawal, 'hyperliquid'], [usePolymarketWithdrawal, 'polymarket'],
]) {
  test(`${useWithdrawal.name} stays loading during the real exit transition and resumes processing after reload`, async () => {
    const transfer = Promise.withResolvers()
    const entered = Promise.withResolvers()
    state.executeTransfer = async params => {
      params.onSubmissionStateChange('preparing')
      params.onSubmissionStateChange('submitting')
      entered.resolve()
      return transfer.promise
    }
    const details = { ...swapBasicData, source_network: { ...swapBasicData.source_network, type: providerType },
      id: 'swap-1', status: 'user_transfer_pending', transactions: [], use_deposit_address: false }
    let response = { data: { swap: details } }
    const context = createSwapContext({
      Client: class {}, getSwapId: () => 'swap-1', getAccount: () => undefined, stores,
      swr: { default: () => ({}) },
      overrides: {
        '@/components/utils/resolveSwapPhase': phases,
        '@/hooks/useSwapPolling': { useSwapPolling: () => ({ data: response, mutate() {} }) },
      },
    })
    let observed, withdrawal
    const buttonStates = []
    function Controls() {
      withdrawal = useWithdrawal({ swapId: 'swap-1', swapBasicData, refuel: false })
      buttonStates.push(withdrawal.loading)
      return createElement('button', { disabled: withdrawal.loading }, withdrawal.loading ? 'Withdrawing' : 'Withdraw')
    }
    function Screen() {
      observed = context.useSwapDataState()
      state.executionUpdates = context.useSwapDataUpdate()
      return createElement(WalletExecutionTransition, {
        controlsKey: observed.resolved.showWithdrawScreen ? 'withdraw' : 'processing',
        controls: observed.resolved.showWithdrawScreen ? createElement(Controls) : null,
        workflow: !observed.resolved.showWithdrawScreen ? createElement('output', null, 'Processing') : null,
      })
    }
    const container = document.createElement('div')
    const render = () => act(async () => executionRoot.render(createElement(context.SwapDataProvider, null, createElement(Screen))))
    await act(async () => executionRoot.unmount())
    executionRoot = createRoot(container)
    await render()
    assert.equal(container.querySelector('button')?.disabled, false)
    let pending
    try {
      await act(async () => { pending = withdrawal.handleWithdraw(); await entered.promise })
      assert.equal(container.querySelector('button')?.textContent, 'Withdrawing')
      assert.equal(container.querySelector('button')?.disabled, true)
      assert.equal(observed.resolved.phase, 'awaiting_user_deposit', 'an in-flight request is not accepted yet')
      const submittingRenderCount = buttonStates.length
      await act(async () => { transfer.resolve(''); await pending })
      assert.equal(state.successes, 1)
      assert.equal(container.querySelector('output')?.textContent, 'Processing')
      assert.ok(container.querySelector('button'), 'the real exit transition retains the outgoing controls')
      assert.equal(container.querySelector('button').disabled, true, 'the outgoing button stays disabled until its exit finishes')
      assert.equal(container.querySelector('button').textContent, 'Withdrawing')
      assert.equal(observed.resolved.phase, 'input_pending')
      assert.equal(observed.flow.kind, 'specialized-wallet')
      assert.ok(buttonStates.slice(submittingRenderCount).every(loading => loading), 'the active button never returns after acceptance')
      assert.equal(state.executionUpdates.canAdjustAmount(), false, 'accepted withdrawals keep the submitted amount locked')
      const receipt = useSwapTransactionStore.getState().swapTransactions['swap-1']
      assert.equal(getExplorerUrl('https://explorer.test/tx/{0}', receipt.hash), '', 'no transaction link without a hash')

      await act(async () => executionRoot.unmount())
      await reloadTransactionStore()
      executionRoot = createRoot(container)
      await render()
      assert.equal(container.textContent, 'Processing')
      assert.equal(observed.resolved.phase, 'input_pending')
      assert.equal(state.transfers.length, 1)
      assert.equal(state.successes, 1, 'reopening does not replay submission success')
      assert.equal(state.executionUpdates.canAdjustAmount(), false)

      response = { data: { swap: { ...details, transactions: [{ type: 'input', status: 'completed',
        transaction_hash: 'indexed-withdrawal', confirmations: 1, max_confirmations: 1 }] } } }
      await render()
      assert.equal(observed.resolved.phase, 'output_pending', 'backend confirmation continues the normal processing flow')
    } finally {
      await act(async () => { transfer.resolve(''); await pending })
    }
  })
}

test('Hyperliquid passes the deposit action amount and its token to the provider', async () => {
  const action = { type: 'transfer', to_address: 'deposit', amount: 1.23456789,
    amount_in_base_units: '123456789', token: { decimals: 8, symbol: 'USDC' } }
  state.depositActions = [action]
  state.executeTransfer = async () => ''
  const mounted = await mountWithdrawal(useHyperliquidWithdrawal)
  try {
    await act(async () => mounted.result.handleWithdraw())
    assert.equal(state.transfers.length, 1)
    const params = state.transfers[0][0]
    assert.equal(params.amountInBaseUnits, action.amount_in_base_units)
    assert.equal(params.amount, action.amount)
    assert.equal(params.token, action.token)
  } finally {
    await mounted.unmount()
  }
})

test('Hyperliquid does not withdraw the requested amount when the deposit action has no base-unit amount', async () => {
  state.depositActions = [{ type: 'transfer', to_address: 'deposit' }]
  const mounted = await mountWithdrawal(useHyperliquidWithdrawal)
  try {
    await act(async () => mounted.result.handleWithdraw())
    assert.equal(mounted.result.error.details, 'No withdrawal amount')
    assert.deepEqual(state.transfers, [])
    assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
  } finally {
    await mounted.unmount()
  }
})

for (const reload of [false, true]) {
  test(`Hyperliquid retries a definitive funding refusal on the same swap${reload ? ' after reload' : ''}`, async () => {
    state.executeTransfer = async params => {
      params.onSubmissionStateChange('preparing')
      params.onSubmissionStateChange('submitting')
      params.onSubmissionStateChange('not_submitted')
      throw Object.assign(new Error('Insufficient balance'), { header: 'Insufficient balance' })
    }
    let mounted = await mountWithdrawal(useHyperliquidWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(mounted.result.error.header, 'Insufficient balance')
      assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
      assert.deepEqual(useSwapTransactionStore.getState().swapTransactions, {})
      if (reload) {
        await mounted.unmount()
        await reloadTransactionStore()
        mounted = await mountWithdrawal(useHyperliquidWithdrawal)
      }

      state.executeTransfer = async params => {
        params.onSubmissionStateChange('preparing')
        params.onSubmissionStateChange('submitting')
        return ''
      }
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(mounted.result.error, undefined)
      assert.deepEqual(state.transfers.map(([params]) => params.swapId), ['swap-1', 'swap-1'])
      assert.equal(state.creations, 0)
      assert.deepEqual(state.refreshes, [])
      assert.equal(state.successes, 1)
      assert.deepEqual(state.published, [])
      assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
      assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].providerSubmissionAccepted, true)
    } finally {
      await mounted.unmount()
    }
  })
}

for (const useWithdrawal of [useHyperliquidWithdrawal, usePolymarketWithdrawal]) {
  for (const change of ['amount', 'destination']) {
    test(`${useWithdrawal.name} prepares new instructions after changing the reviewed ${change}`, async () => {
      state.swapDetails = undefined
      const created = []
      state.createSwap = async values => {
        const id = `created-${created.length + 1}`
        const action = { type: 'transfer', to_address: `${id}-deposit`, call_data: `0x${created.length + 1}`,
          amount: Number(values.amount), amount_in_base_units: String(Number(values.amount) * 1_000_000) }
        created.push({ id, values, action })
        return { swap: { id }, deposit_actions: [action] }
      }
      state.getDepositActions = async id => ({ data: [created.find(swap => swap.id === id).action] })
      state.error = userRejectedError()
      const props = { swapId: undefined, swapBasicData: { ...swapBasicData, requested_amount: '10' } }
      const mounted = await mountWithdrawal(useWithdrawal, props)
      try {
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(mounted.result.rejected, true)
        assert.equal(created.length, 1)
        assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})

        // Adjust amount detaches the context ID while the Page 2 controller stays mounted.
        props.swapBasicData = change === 'amount'
          ? { ...props.swapBasicData, requested_amount: '5' }
          : { ...props.swapBasicData, destination_address: 'another-recipient' }
        await mounted.rerender()
        state.executeTransfer = async params => {
          params.onSubmissionStateChange('preparing')
          params.onSubmissionStateChange('submitting')
          return 'new-withdrawal-hash'
        }
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(created.length, 2)
        const transfer = state.transfers.at(-1)[0]
        assert.equal(transfer.swapId, 'created-2')
        assert.equal(transfer.depositAddress, created[1].action.to_address)
        assert.equal(transfer.amount, change === 'amount' ? 5 : 10)
        assert.equal(created[1].values.destination_address, props.swapBasicData.destination_address)
        if (useWithdrawal === useHyperliquidWithdrawal) {
          assert.equal(transfer.amountInBaseUnits, created[1].action.amount_in_base_units)
        } else {
          assert.equal(transfer.callData, created[1].action.call_data)
        }
        assert.deepEqual(state.actionRefreshes, [], 'new drafts cannot refresh the rejected swap')
        assert.equal(useSwapTransactionStore.getState().swapTransactions['created-2'].hash, 'new-withdrawal-hash')
      } finally {
        await mounted.unmount()
      }
    })
  }

  test(`${useWithdrawal.name} reuses the prepared swap when reviewed inputs are unchanged`, async () => {
    state.swapDetails = undefined
    state.error = userRejectedError()
    state.createSwap = async () => ({ swap: { id: 'same-draft' }, deposit_actions: state.depositActions })
    const mounted = await mountWithdrawal(useWithdrawal, { swapId: undefined })
    try {
      await act(async () => mounted.result.handleWithdraw())
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.creations, 1)
      assert.deepEqual(state.actionRefreshes, [['same-draft', 'source']])
      assert.equal(state.transfers.at(-1)[0].swapId, 'same-draft')
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} remount retry cannot unlock the original pending wallet request`, async () => {
    const paused = Promise.withResolvers()
    const entered = Promise.withResolvers()
    state.executeTransfer = async params => {
      params.onSubmissionStateChange('preparing')
      entered.resolve()
      await paused.promise
      throw userRejectedError()
    }
    const original = await mountWithdrawal(useWithdrawal)
    let pending, reopened
    try {
      await act(async () => { pending = original.result.handleWithdraw(); await entered.promise })
      await original.unmount()
      assert.equal(state.executing, true)
      reopened = await mountWithdrawal(useWithdrawal)
      await act(async () => reopened.result.handleWithdraw())
      assert.match(reopened.result.error.details, /already in progress/)
      assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
      assert.equal(state.executionUpdates.canAdjustAmount(), false, 'the rejected retry cannot release the original operation')
      await act(async () => { paused.resolve(); await pending })
      assert.equal(state.executionUpdates.canAdjustAmount(), true)
      assert.equal(state.transfers.length, 1)
    } finally {
      await act(async () => { paused.resolve(); await pending })
      if (reopened) await reopened.unmount()
    }
  })

  for (const stage of ['preparation', 'signing']) {
    test(`${useWithdrawal.name} locks adjustment throughout ${stage}, including after unmount`, async () => {
      const paused = Promise.withResolvers()
      if (stage === 'preparation') state.getDepositActions = async () => {
        await paused.promise
        return { data: state.depositActions }
      }
      state.executeTransfer = async params => {
        params.onSubmissionStateChange('preparing')
        if (stage === 'signing') await paused.promise
        throw userRejectedError()
      }
      const mounted = await mountWithdrawal(useWithdrawal)
      let pending, unmounted = false
      try {
        await act(async () => {
          pending = mounted.result.handleWithdraw()
          assert.equal(state.executing, true, 'lock synchronously before any async work or rerender')
        })
        assert.equal(state.executing, true)
        assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {}, 'preparation has no durable submission marker')
        await mounted.unmount(); unmounted = true
        assert.equal(state.executing, true, 'closing the screen must not unlock an active wallet request')
      } finally {
        await act(async () => { paused.resolve(); await pending })
        if (!unmounted) await mounted.unmount()
      }
      assert.equal(state.executing, false)
      assert.deepEqual(state.executionLocks, [true, false])
      assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
    })
  }
  for (const [label, error, rejected, outcome] of [
    ['legacy rejected UI label', Object.assign(new Error('Request declined'), { name: 'TransactionRejected' }), true, 'failed'],
    ['declared cancellation', userRejectedError(), true, 'rejected'],
    ['legacy user rejection wording', new Error('User has rejected the request.'), true, 'rejected'],
    ['provider failure', new Error('RPC unavailable'), false, 'failed'],
  ]) {
    test(`${useWithdrawal.name} preserves UI behavior and retry classification for ${label}`, async () => {
      state.error = error
      state.events = []
      state.errors = []
      let result
      function Probe() {
        result = useWithdrawal({ swapId: 'swap-1', swapBasicData, refuel: false })
        return null
      }
      const container = document.createElement('div')
      const root = createRoot(container)
      try {
        await act(async () => root.render(createElement(Probe)))
        await act(async () => result.handleWithdraw())
        assert.equal(result.rejected, rejected)
        assert.equal(result.error === undefined, rejected)
        assert.equal(result.loading, false)
        assert.equal(state.events.at(-1).outcome, outcome)
        const terminalStep = outcome === 'rejected' ? 'wallet_action_rejected' : 'wallet_action_failed'
        assert.deepEqual(state.events.map(event => event.step), ['wallet_prompt_opened', terminalStep])
        assert.equal(state.errors.length, outcome === 'failed' ? 1 : 0)
        assert.equal(state.successes, 0)
        assert.deepEqual(state.published, [])
        assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
        let retryCreations = 0
        state.createSwap = async () => {
          retryCreations++
          return { swap: { id: 'retry-swap' }, deposit_actions: [{ type: 'transfer', to_address: 'retry-deposit', call_data: '0x', amount_in_base_units: '1000000' }] }
        }
        state.getDepositActions = async () => ({ data: [{ type: 'transfer', to_address: 'refreshed-deposit', call_data: '0xfresh', amount_in_base_units: '2000000' }] })
        await act(async () => result.handleWithdraw())
        assert.equal(retryCreations, 0, 'a pre-submission failure retries on the original swap')
        assert.equal(state.transfers.at(-1)[0].depositAddress, 'refreshed-deposit')
        assert.deepEqual(state.actionRefreshes, [['swap-1', 'source'], ['swap-1', 'source']])
        if (useWithdrawal === usePolymarketWithdrawal) {
          assert.equal(state.transfers.at(-1)[0].callData, '0xfresh')
        } else {
          assert.equal(state.transfers.at(-1)[0].amountInBaseUnits, '2000000')
        }
        assert.equal(state.events.at(-1).swapId, 'swap-1')
        const retries = state.events.filter(event => event.step === 'retry_requested')
        assert.equal(retries.length, 1)
        assert.equal(retries[0].reasonCode, outcome === 'rejected' ? 'user_rejected' : 'provider_withdrawal_failed')
        assert.deepEqual(state.events.map(event => event.step), [
          'wallet_prompt_opened', terminalStep, 'retry_requested', 'wallet_prompt_opened', terminalStep,
        ])
      } finally {
        await act(async () => root.unmount())
      }
    })
  }

  for (const failure of [new Error('Response timed out'), Object.assign(new Error('Provider declined'), { name: 'TransactionRejected' }), userRejectedError()]) {
    test(`${useWithdrawal.name} reconciles an ambiguous submission without withdrawing again: ${failure.message}`, async () => {
      state.executeTransfer = async params => {
        params.onSubmissionStateChange('preparing')
        params.onSubmissionStateChange('submitting')
        // Late progress cannot downgrade an already submitted request.
        params.onSubmissionStateChange('preparing')
        throw failure
      }
      let mounted = await mountWithdrawal(useWithdrawal)
      try {
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-1'], true)
        assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'], undefined)
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(mounted.result.error.header, 'Withdrawal status unknown')
        assert.equal(state.transfers.length, 1)
        assert.equal(state.creations, 0)
        assert.equal(state.freshAttempts, 0)
        assert.deepEqual(state.refreshes, [['swap-1', 'source']])
        assert.equal(state.successes, 0)

        await mounted.unmount()
        // Simulate rehydrating after a reload, then reopen the same swap.
        await reloadTransactionStore()
        state.depositActions = undefined
        state.getDepositActions = async () => assert.fail('reconciliation does not need deposit instructions')
        mounted = await mountWithdrawal(useWithdrawal)
        state.getSwap = async () => { throw new Error('Status unavailable') }
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(mounted.result.error.details, 'Status unavailable')
        assert.equal(state.transfers.length, 1)
        assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-1'], true)

        state.getSwap = async id => ({ data: { swap: { id, transactions: [
          { type: 'input', status: 'pending', transaction_hash: 'accepted-withdrawal' },
        ] } } })
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(state.transfers.length, 1, 'reconciliation never opens a second provider request')
        assert.equal(state.creations, 0)
        assert.equal(state.selectedSwapId, 'swap-1')
        assert.deepEqual(state.actionRefreshes, [['swap-1', 'source']], 'ambiguous retries do not prepare another withdrawal')
        assert.deepEqual(state.published, [['swap-1', 'accepted-withdrawal']])
        assert.equal(state.successes, 1)
        assert.equal(mounted.result.error, undefined)
        assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-1'], undefined)
      } finally {
        await mounted.unmount()
      }
    })
  }

  test(`${useWithdrawal.name} treats an unclassified provider error as ambiguous`, async () => {
    state.executeTransfer = async () => { throw new Error('Unknown provider failure') }
    const mounted = await mountWithdrawal(useWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.transfers.length, 1)
      assert.equal(state.creations, 0)
      assert.equal(mounted.result.error.header, 'Withdrawal status unknown')
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} reuses a submitted withdrawal after reloading the transaction store`, async () => {
    state.executeTransfer = async () => 'submitted-withdrawal'
    let mounted = await mountWithdrawal(useWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      await mounted.unmount()
      await reloadTransactionStore()
      assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
      state.depositActions = undefined
      state.getDepositActions = async () => assert.fail('a submitted withdrawal does not need deposit instructions')
      state.getSwap = async id => ({ data: { swap: { id, transactions: [
        { type: 'input', status: 'pending', transaction_hash: 'submitted-withdrawal' },
      ] } } })
      mounted = await mountWithdrawal(useWithdrawal)
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.transfers.length, 1)
      assert.equal(state.creations, 0)
      assert.deepEqual(state.refreshes, [['swap-1', 'source']], 'a saved receipt always fetches its current backend outcome')
      assert.equal(mounted.result.error, undefined)
      assert.equal(state.successes, 2)
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} reconciles a stored failed transaction before allowing another withdrawal`, async () => {
    useSwapTransactionStore.getState().setSwapTransaction('swap-1', 'withdrawal-hash')
    const mounted = await mountWithdrawal(useWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.transfers.length, 0)
      assert.equal(state.creations, 0)
      assert.deepEqual(state.refreshes, [['swap-1', 'source']])
      assert.equal(mounted.result.error.header, 'Withdrawal status unknown')
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} retries a backend-confirmed failed withdrawal on the existing swap`, async () => {
    const store = useSwapTransactionStore.getState()
    store.setSwapTransaction('swap-1', 'failed-withdrawal')
    store.markSubmissionPending('swap-1')
    store.markSubmissionPending('swap-2')
    await reloadTransactionStore()
    state.getSwap = async id => ({ data: { swap: { id, transactions: [
      { type: 'input', status: 'failed', transaction_hash: 'failed-withdrawal' },
    ] }, deposit_actions: state.depositActions } })
    state.getDepositActions = async () => {
      const current = useSwapTransactionStore.getState()
      assert.equal(current.swapTransactions['swap-1'], undefined, 'clear the confirmed failed transaction before preparation')
      assert.equal(current.pendingSubmissions['swap-1'], undefined, 'clear its pending marker before preparation')
      return { data: [{ type: 'transfer', to_address: 'fresh-deposit', call_data: '0xfresh', amount_in_base_units: '2000000' }] }
    }
    state.executeTransfer = async () => 'retry-hash'
    const mounted = await mountWithdrawal(useWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(mounted.result.error, undefined)
      assert.deepEqual(state.refreshes, [['swap-1', 'source']])
      assert.deepEqual(state.actionRefreshes, [['swap-1', 'source']])
      assert.equal(state.reconciled.length, 1)
      assert.equal(state.transfers.length, 1)
      assert.equal(state.transfers[0][0].swapId, 'swap-1')
      assert.equal(state.transfers[0][0].depositAddress, 'fresh-deposit')
      assert.equal(state.creations, 0)
      assert.equal(state.successes, 1)
      assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'retry-hash')
      assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, { 'swap-2': true })
    } finally {
      await mounted.unmount()
    }
  })

  for (const [label, hash, transactions] of [
    ['an unrelated failed input', 'withdrawal-hash', [{ type: 'input', status: 'failed', transaction_hash: 'other-hash' }]],
    ['a failed output', 'withdrawal-hash', [{ type: 'output', status: 'failed', transaction_hash: 'withdrawal-hash' }]],
    ['a missing local hash', '', [{ type: 'input', status: 'failed', transaction_hash: 'withdrawal-hash' }]],
    ['an unindexed active input', 'withdrawal-hash', [
      { type: 'input', status: 'failed', transaction_hash: 'withdrawal-hash' },
      { type: 'input', status: 'pending', transaction_hash: '' },
    ]],
  ]) {
    test(`${useWithdrawal.name} preserves the retry block with ${label}`, async () => {
      const store = useSwapTransactionStore.getState()
      store.setSwapTransaction('swap-1', hash)
      store.markSubmissionPending('swap-1')
      const transaction = useSwapTransactionStore.getState().swapTransactions['swap-1']
      state.getSwap = async id => ({ data: { swap: { id, transactions }, deposit_actions: state.depositActions } })
      const mounted = await mountWithdrawal(useWithdrawal)
      try {
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(mounted.result.error.header, 'Withdrawal status unknown')
        assert.deepEqual(state.actionRefreshes, [])
        assert.deepEqual(state.transfers, [])
        assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'], transaction)
        assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-1'], true)
      } finally {
        await mounted.unmount()
      }
    })
  }

  test(`${useWithdrawal.name} does not retry a confirmed failed input while a deposit is active`, async () => {
    useSwapTransactionStore.getState().setSwapTransaction('swap-1', 'failed-withdrawal')
    state.getSwap = async id => ({ data: {
      swap: { id, transactions: [{ type: 'input', status: 'failed', transaction_hash: 'failed-withdrawal' }] },
      deposit_actions: [{ type: 'transfer', step: 'deposit', status: 'pending' }],
    } })
    const mounted = await mountWithdrawal(useWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(mounted.result.error, undefined)
      assert.deepEqual(state.actionRefreshes, [])
      assert.deepEqual(state.transfers, [])
      assert.equal(state.successes, 1)
      assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'failed-withdrawal', 'fetched progress must not overwrite receipt history with an empty hash')
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} retains a newly created swap across a safe retry before context catches up`, async () => {
    state.swapDetails = undefined
    state.createSwap = async () => ({ swap: { id: 'new-swap' }, deposit_actions: [
      { type: 'transfer', to_address: 'new-deposit', call_data: 'new-calldata', amount_in_base_units: '1000000' },
    ] })
    state.error = userRejectedError()
    const mounted = await mountWithdrawal(useWithdrawal, { swapId: undefined })
    try {
      await act(async () => mounted.result.handleWithdraw())
      state.getDepositActions = async () => ({ data: [{ type: 'transfer', to_address: 'refreshed-deposit', call_data: '0xfresh', amount_in_base_units: '2000000' }] })
      state.executeTransfer = async () => ''
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.creations, 1)
      assert.equal(state.freshAttempts, 1)
      assert.deepEqual(state.transfers.map(([params]) => [params.swapId, params.depositAddress]), [
        ['new-swap', 'new-deposit'], ['new-swap', 'refreshed-deposit'],
      ])
      assert.deepEqual(state.actionRefreshes, [['new-swap', 'source']])
      if (useWithdrawal === usePolymarketWithdrawal) {
        assert.deepEqual(state.transfers.map(([params]) => params.callData), ['new-calldata', '0xfresh'])
      } else {
        assert.deepEqual(state.transfers.map(([params]) => params.amountInBaseUnits), ['1000000', '2000000'])
      }
      assert.deepEqual(state.published, [])
      assert.equal(state.successes, 1)
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} refreshes an existing swap with missing context instead of replacing it`, async () => {
    state.swapDetails = undefined
    state.depositActions = undefined
    state.getDepositActions = async () => ({ data: [{ type: 'transfer', to_address: 'refreshed-deposit', call_data: '0xfresh', amount_in_base_units: '2000000' }] })
    state.executeTransfer = async () => ''
    const mounted = await mountWithdrawal(useWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.creations, 0)
      assert.deepEqual(state.actionRefreshes, [['swap-1', 'source']])
      assert.equal(state.transfers[0][0].depositAddress, 'refreshed-deposit')
      if (useWithdrawal === useHyperliquidWithdrawal) {
        assert.equal(state.transfers[0][0].amountInBaseUnits, '2000000')
      }
      assert.deepEqual(state.published, [])
    } finally {
      await mounted.unmount()
    }
  })

  for (const [label, getDepositActions] of [
    ['request failure', async () => { throw new Error('Actions unavailable') }],
    ['API error', async () => ({ error: { message: 'Actions unavailable' } })],
    ['empty actions', async () => ({ data: [] })],
    ['incomplete actions', async () => ({ data: [{ type: 'transfer' }] })],
  ]) {
    test(`${useWithdrawal.name} does not reuse stale instructions after a retry refresh returns ${label}`, async () => {
      state.error = userRejectedError()
      const mounted = await mountWithdrawal(useWithdrawal)
      try {
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(state.transfers.length, 1)
        state.getDepositActions = getDepositActions
        state.executeTransfer = async () => ''
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(state.transfers.length, 1, 'failed refresh must not fall back to cached actions')
        assert.equal(state.successes, 0)
        assert.ok(mounted.result.error)
        assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})

        state.getDepositActions = async () => ({ data: [{ type: 'transfer', to_address: 'current-deposit', call_data: '0xcurrent', amount_in_base_units: '3000000' }] })
        await act(async () => mounted.result.handleWithdraw())
        assert.equal(state.creations, 0)
        assert.equal(state.transfers.length, 2)
        assert.equal(state.transfers[1][0].depositAddress, 'current-deposit')
        assert.deepEqual(state.actionRefreshes, Array.from({ length: 3 }, () => ['swap-1', 'source']))
        assert.deepEqual(state.published, [])
        assert.equal(state.successes, 1)
      } finally {
        await mounted.unmount()
      }
    })
  }

  test(`${useWithdrawal.name} prevents concurrent submissions`, async () => {
    const transfer = Promise.withResolvers()
    state.executeTransfer = () => transfer.promise
    const mounted = await mountWithdrawal(useWithdrawal)
    let pending
    try {
      await act(async () => { pending = mounted.result.handleWithdraw() })
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.transfers.length, 1)
      await act(async () => { transfer.resolve('hash'); await pending })
      assert.equal(state.successes, 1)
    } finally {
      transfer.resolve('hash')
      if (pending) await pending
      await mounted.unmount()
    }
  })

  for (const hash of ['relayed-hash', '', undefined]) {
    test(`${useWithdrawal.name} reports one submission and hands off a successful withdrawal: ${JSON.stringify(hash)}`, async () => {
      state.executeTransfer = async () => hash
      const mounted = await mountWithdrawal(useWithdrawal)
      try {
        await act(async () => mounted.result.handleWithdraw())
        assert.deepEqual(state.events.map(event => event.step), ['wallet_prompt_opened', 'transaction_submitted'])
        assert.equal(state.events[1].transactionHash, hash || undefined)
        for (const event of state.events) {
          assert.equal(event.swapId, 'swap-1')
          assert.equal(event.path, useWithdrawal.name.slice(3))
          assert.equal(event.provider, 'test-wallet')
        }
        assert.deepEqual(state.published, hash ? [['swap-1', hash]] : [])
        assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-1'], undefined)
        assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].providerSubmissionAccepted, hash ? undefined : true)
        assert.equal(state.successes, 1)
        assert.deepEqual(state.errors, [])
        assert.equal(mounted.result.loading, true, 'accepted withdrawals stay busy while the outgoing view is retained')
        assert.equal(mounted.result.error, undefined)
        assert.equal(mounted.result.rejected, false)
      } finally {
        await mounted.unmount()
      }
    })
  }

  test(`${useWithdrawal.name} uses the newly created swap ID for wallet events`, async () => {
    state.swapDetails = undefined
    state.createSwap = async () => ({ swap: { id: 'new-swap' }, deposit_actions: [
      { type: 'transfer', to_address: 'new-deposit', call_data: 'new-calldata', amount_in_base_units: '1000000' },
    ] })
    state.executeTransfer = async () => ''
    const mounted = await mountWithdrawal(useWithdrawal, { swapId: undefined })
    try {
      await act(async () => mounted.result.handleWithdraw())
      assert.deepEqual(state.events.map(event => [event.step, event.swapId]), [
        ['wallet_prompt_opened', 'new-swap'], ['transaction_submitted', 'new-swap'],
      ])
      assert.equal(state.transfers[0][0].depositAddress, 'new-deposit')
      assert.deepEqual(state.published, [])
      assert.equal(mounted.result.loading, true, 'the newly created swap receipt keeps the outgoing view busy')
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} does not report a preparation failure as a wallet request`, async () => {
    state.createSwap = async () => { throw new Error('Swap creation failed') }
    const mounted = await mountWithdrawal(useWithdrawal, { swapId: undefined })
    try {
      await act(async () => mounted.result.handleWithdraw())
      assert.deepEqual(state.events, [])
      assert.deepEqual(state.transfers, [])
      assert.equal(state.errors.length, 1)
      assert.equal(mounted.result.error.details, 'Swap creation failed')
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} does not report a success callback failure as a wallet failure`, async () => {
    state.executeTransfer = async () => ''
    state.onSuccess = () => { throw new Error('Success callback failed') }
    const mounted = await mountWithdrawal(useWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      assert.deepEqual(state.events.map(event => event.step), ['wallet_prompt_opened', 'transaction_submitted'])
      assert.equal(state.errors.length, 1)
      assert.equal(mounted.result.error.details, 'Success callback failed')
      state.onSuccess = undefined
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.transfers.length, 1, 'a callback failure must not repeat the withdrawal')
      assert.equal(state.creations, 0)
      assert.equal(state.events.filter(event => event.step === 'transaction_submitted').length, 1)
    } finally {
      await mounted.unmount()
    }
  })

  for (const change of ['account', 'provider', 'source']) {
    test(`${useWithdrawal.name} records a late receipt after ${change} cancellation without a stale handoff`, async () => {
      const transfer = Promise.withResolvers()
      state.executeTransfer = () => transfer.promise
      const props = { swapBasicData }
      const mounted = await mountWithdrawal(useWithdrawal, props)
      let pending
      try {
        await act(() => { pending = mounted.result.handleWithdraw() })
        if (change === 'account') state.sourceAddress = 'different-account'
        if (change === 'provider') state.provider = { name: 'different-provider' }
        if (change === 'source') props.swapBasicData = { ...swapBasicData, source_network: { name: 'different-source' } }
        await mounted.rerender()
        await act(async () => { transfer.resolve('late-receipt'); await pending })
        assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'late-receipt')
        assert.equal(state.successes, 0)
        assert.deepEqual(state.events.map(event => event.step), ['wallet_prompt_opened'])
        assert.deepEqual(state.errors, [])
      } finally {
        transfer.resolve('late-receipt')
        await pending
        await mounted.unmount()
      }
    })
  }

  test(`${useWithdrawal.name} provider snapshot updates preserve the active operation`, async () => {
    state.provider = { name: 'same-provider' }
    const transfer = Promise.withResolvers()
    state.executeTransfer = () => transfer.promise
    const mounted = await mountWithdrawal(useWithdrawal)
    let pending
    try {
      await act(() => { pending = mounted.result.handleWithdraw() })
      state.provider = { name: 'same-provider' }
      await mounted.rerender()
      await act(async () => { transfer.resolve('snapshot-receipt'); await pending })
      assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'snapshot-receipt')
      assert.equal(state.successes, 1)
      assert.deepEqual(state.errors, [])
    } finally {
      transfer.resolve('snapshot-receipt')
      await pending
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} hiding controls keeps an active operation alive`, async () => {
    const transfer = Promise.withResolvers()
    state.executeTransfer = () => transfer.promise
    const mounted = await mountWithdrawal(useWithdrawal)
    let pending
    try {
      await act(() => { pending = mounted.result.handleWithdraw() })
      await mounted.setActive(false)
      await act(async () => { transfer.resolve('submitted-while-hidden'); await pending })
      assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'submitted-while-hidden')
      assert.equal(state.successes, 1)
      assert.deepEqual(state.errors, [])
    } finally {
      transfer.resolve('submitted-while-hidden')
      await pending
      await mounted.unmount()
    }
  })

  for (const rejected of [false, true]) {
    test(`${useWithdrawal.name} stops reporting outcomes after unmount: ${rejected ? 'rejected' : 'succeeded'}`, async () => {
      const transfer = Promise.withResolvers()
      state.executeTransfer = () => transfer.promise
      const mounted = await mountWithdrawal(useWithdrawal)
      let pending
      try {
        await act(async () => { pending = mounted.result.handleWithdraw() })
        assert.deepEqual(state.events.map(event => event.step), ['wallet_prompt_opened'])
      } finally {
        await mounted.unmount()
      }
      await act(async () => {
        if (rejected) transfer.reject(userRejectedError())
        else transfer.resolve('late-hash')
        await pending
      })
      assert.deepEqual(state.events.map(event => event.step), ['wallet_prompt_opened'])
      assert.deepEqual(state.errors, [])
      assert.deepEqual(state.published, rejected ? [] : [['swap-1', 'late-hash']])
      assert.equal(state.successes, 0)
    })
  }
}
