import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { userRejectedError } from '@layerswap/wallet-core/errors'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const fixtureUrl = 'data:text/javascript,' + encodeURIComponent(`
  export const state = { events: [], errors: [] }
  export const useSwapDataState = () => ({ swapDetails: state.swapDetails, depositActionsResponse: [
    { type: 'transfer', to_address: 'deposit', call_data: '0x' }
  ] })
  export const useSwapDataUpdate = () => ({ setSwapId() {}, startFreshSwapAttempt() {}, createSwap: (...args) => state.createSwap(...args) })
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
  export const BackendTransactionStatus = { Pending: 'pending' }
  export const useSwapTransactionStore = { getState: () => ({ setSwapTransaction: (...args) => state.published.push(args) }) }
`)
const mocked = ['/context/swap', '/context/withdrawalContext', '/context/swapAccounts', '/context/settings',
  '/hooks/useWallet', '/hooks/useTransfer', '/context/callbackProvider', '/lib/ErrorHandler',
  '/lib/apiClients/layerSwapApiClient', '/stores/swapTransactionStore']
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (/\/use(?:Hyperliquid|Polymarket)Withdrawal\.js$/.test(context.parentURL ?? '') && mocked.some(path => specifier.endsWith(path))) {
    return { url: fixtureUrl, shortCircuit: true }
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
  return nextResolve(specifier, context)
} })
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})
const { state } = await import(fixtureUrl)
const { createRoot } = await import('react-dom/client')
const { useHyperliquidWithdrawal } = await import('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/Hyperliquid/useHyperliquidWithdrawal.js')
const { usePolymarketWithdrawal } = await import('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/Polymarket/usePolymarketWithdrawal.js')
const swapBasicData = {
  requested_amount: '1', source_network: { name: 'source' }, destination_network: { name: 'destination' },
  source_token: { decimals: 6 }, destination_token: {}, destination_address: 'destination',
}

beforeEach(() => {
  Object.assign(state, {
    events: [], errors: [], transfers: [], published: [], successes: 0, error: undefined,
    swapDetails: { id: 'swap-1' }, onSuccess: undefined,
    executeTransfer: async () => { throw state.error },
    createSwap: async () => assert.fail('unexpected swap creation'),
  })
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
        let retryCreations = 0
        state.createSwap = async () => {
          retryCreations++
          return { swap: { id: 'retry-swap' }, deposit_actions: [{ type: 'transfer', to_address: 'retry-deposit', call_data: '0x' }] }
        }
        await act(async () => result.handleWithdraw())
        assert.equal(retryCreations, 1, 'an unstarted specialized withdrawal retries with a fresh swap')
        assert.equal(state.transfers.at(-1)[0].depositAddress, 'retry-deposit')
        assert.equal(state.events.at(-1).swapId, 'retry-swap')
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
      { type: 'transfer', to_address: 'new-deposit', call_data: 'new-calldata' },
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
      assert.deepEqual(state.published, [])
      assert.equal(state.successes, 0)
    })
  }
}
