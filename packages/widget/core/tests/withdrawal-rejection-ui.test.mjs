import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { userRejectedError } from '@layerswap/wallet-core/errors'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.test' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const fixtureUrl = 'data:text/javascript,' + encodeURIComponent(`
  export const state = { events: [], errors: [] }
  export const useSwapDataState = () => ({ swapDetails: state.swapDetails, depositActionsResponse: state.depositActions })
  export const useSwapDataUpdate = () => ({ setSwapId(id) { state.selectedSwapId = id },
    startFreshSwapAttempt() { state.freshAttempts++ },
    createSwap: (...args) => { state.creations++; return state.createSwap(...args) },
    mutateSwap: async response => { state.reconciled.push(response); state.swapDetails = response.data.swap },
  })
  export const useSettingsState = () => ({ networks: [], sourceRoutes: [] })
  export const useInitialSettings = () => ({})
  export const useWalletWithdrawalState = () => ({ onWalletWithdrawalSuccess() { state.successes++; state.onSuccess?.() } })
  export const useSelectedAccount = () => ({ id: 'wallet', address: 'source' })
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
  export const BackendTransactionStatus = { Pending: 'pending', Failed: 'failed' }
  export const TransactionType = { Input: 'input' }
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
  for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})
const { state } = await import(fixtureUrl)
const { createRoot } = await import('react-dom/client')
const { useHyperliquidWithdrawal } = await import('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/Hyperliquid/useHyperliquidWithdrawal.js')
const { usePolymarketWithdrawal } = await import('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/Polymarket/usePolymarketWithdrawal.js')
const { useSwapTransactionStore } = await import('../dist/esm/stores/swapTransactionStore.js')
const providerExecutionUrl = new URL('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/executeProviderWithdrawal.js', import.meta.url)
const { executeProviderWithdrawal } = await import(providerExecutionUrl)
const swapBasicData = {
  requested_amount: '1', source_network: { name: 'source' }, destination_network: { name: 'destination' },
  source_token: { decimals: 6 }, destination_token: {}, destination_address: 'destination',
}

let unsubscribeStore
beforeEach(() => {
  useSwapTransactionStore.setState({ swapTransactions: {}, pendingSubmissions: {} })
  Object.assign(state, {
    events: [], errors: [], transfers: [], published: [], successes: 0, error: undefined,
    refreshes: [], actionRefreshes: [], reconciled: [], freshAttempts: 0, creations: 0, selectedSwapId: 'swap-1',
    swapDetails: { id: 'swap-1' }, onSuccess: undefined,
    depositActions: [{ type: 'transfer', to_address: 'deposit', call_data: '0x', amount_in_base_units: '1000000' }],
    executeTransfer: async params => { params.onSubmissionStateChange('preparing'); throw state.error },
    createSwap: async () => assert.fail('unexpected swap creation'),
    getSwap: async id => ({ data: { swap: { id, status: 'user_transfer_pending', transactions: [] }, deposit_actions: state.depositActions } }),
    getDepositActions: async () => ({ data: [{ type: 'transfer', to_address: 'refreshed-deposit', call_data: '0xfresh', amount_in_base_units: '2000000' }] }),
  })
  unsubscribeStore = useSwapTransactionStore.subscribe((current, previous) => {
    for (const [id, transaction] of Object.entries(current.swapTransactions)) {
      if (transaction !== previous.swapTransactions[id]) {
        state.published.push([id, transaction.status, transaction.hash])
      }
    }
  })
})
afterEach(() => unsubscribeStore())

async function reloadTransactionStore() {
  const persisted = localStorage.getItem('swapTransactions')
  useSwapTransactionStore.setState({ swapTransactions: {}, pendingSubmissions: {} })
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
    store.setSwapTransaction('swap-1', 'pending', 'hash')
    assert.equal(transitions.length, 1)
    assert.equal(transitions[0].pending, undefined)
    assert.equal(transitions[0].transaction.hash, 'hash')
    assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, { 'swap-2': true })
    assert.deepEqual(JSON.parse(localStorage.getItem('swapTransactions')).state, {
      swapTransactions: { 'swap-1': { hash: 'hash', status: 'pending', timestamp: transitions[0].transaction.timestamp } },
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
  const transaction = { hash: 'existing-hash', status: 'pending', timestamp: 123 }
  localStorage.setItem('swapTransactions', JSON.stringify({
    state: { swapTransactions: { 'swap-1': transaction } }, version: 0,
  }))
  await useSwapTransactionStore.persist.rehydrate()
  assert.deepEqual(useSwapTransactionStore.getState().swapTransactions, { 'swap-1': transaction })
  assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
  useSwapTransactionStore.getState().markSubmissionPending('swap-2')
  assert.equal(useSwapTransactionStore.getState().pendingSubmissions['swap-2'], true)
})

async function mountWithdrawal(useWithdrawal, props = {}) {
  let result
  function Probe() {
    result = useWithdrawal({ swapId: 'swap-1', swapBasicData, refuel: false, ...props })
    return null
  }
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Probe)))
  return { get result() { return result }, unmount: () => act(async () => root.unmount()) }
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

for (const useWithdrawal of [useHyperliquidWithdrawal, usePolymarketWithdrawal]) {
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
        await act(async () => result.handleWithdraw())
        assert.equal(retryCreations, 0, 'a pre-submission failure retries on the original swap')
        assert.equal(state.transfers.at(-1)[0].depositAddress, 'deposit')
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
        assert.deepEqual(state.actionRefreshes, [])
        assert.deepEqual(state.published, [['swap-1', 'pending', 'accepted-withdrawal']])
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
    state.executeTransfer = async () => ''
    let mounted = await mountWithdrawal(useWithdrawal)
    try {
      await act(async () => mounted.result.handleWithdraw())
      await mounted.unmount()
      await reloadTransactionStore()
      assert.deepEqual(useSwapTransactionStore.getState().pendingSubmissions, {})
      state.depositActions = undefined
      state.getDepositActions = async () => assert.fail('a submitted withdrawal does not need deposit instructions')
      mounted = await mountWithdrawal(useWithdrawal)
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.transfers.length, 1)
      assert.equal(state.creations, 0)
      assert.deepEqual(state.refreshes, [])
      assert.equal(mounted.result.error, undefined)
      assert.equal(state.successes, 2)
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} reconciles a stored failed transaction before allowing another withdrawal`, async () => {
    useSwapTransactionStore.getState().setSwapTransaction('swap-1', 'failed', 'withdrawal-hash')
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

  test(`${useWithdrawal.name} retains a newly created swap across a safe retry before context catches up`, async () => {
    state.swapDetails = undefined
    state.createSwap = async () => ({ swap: { id: 'new-swap' }, deposit_actions: [
      { type: 'transfer', to_address: 'new-deposit', call_data: 'new-calldata', amount_in_base_units: '1000000' },
    ] })
    state.error = userRejectedError()
    const mounted = await mountWithdrawal(useWithdrawal, { swapId: undefined })
    try {
      await act(async () => mounted.result.handleWithdraw())
      state.executeTransfer = async () => ''
      await act(async () => mounted.result.handleWithdraw())
      assert.equal(state.creations, 1)
      assert.equal(state.freshAttempts, 1)
      assert.deepEqual(state.transfers.map(([params]) => [params.swapId, params.depositAddress]), [
        ['new-swap', 'new-deposit'], ['new-swap', 'new-deposit'],
      ])
      if (useWithdrawal === usePolymarketWithdrawal) {
        assert.deepEqual(state.transfers.map(([params]) => params.callData), ['new-calldata', 'new-calldata'])
      } else {
        assert.deepEqual(state.transfers.map(([params]) => params.amountInBaseUnits), ['1000000', '1000000'])
      }
      assert.deepEqual(state.published, [['new-swap', 'pending', '']])
      assert.equal(state.successes, 1)
    } finally {
      await mounted.unmount()
    }
  })

  test(`${useWithdrawal.name} refreshes an existing swap with missing context instead of replacing it`, async () => {
    state.swapDetails = undefined
    state.depositActions = undefined
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
      assert.deepEqual(state.published, [['swap-1', 'pending', '']])
    } finally {
      await mounted.unmount()
    }
  })

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
        assert.deepEqual(state.published, [['swap-1', 'pending', hash || '']])
        assert.equal(state.successes, 1)
        assert.deepEqual(state.errors, [])
        assert.equal(mounted.result.loading, false)
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
      assert.deepEqual(state.published, [['new-swap', 'pending', '']])
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
      if (rejected) transfer.reject(userRejectedError())
      else transfer.resolve('late-hash')
      await pending
      assert.deepEqual(state.events.map(event => event.step), ['wallet_prompt_opened'])
      assert.deepEqual(state.errors, [])
      assert.deepEqual(state.published, rejected ? [] : [['swap-1', 'pending', 'late-hash']])
      assert.equal(state.successes, 0)
    })
  }
}
