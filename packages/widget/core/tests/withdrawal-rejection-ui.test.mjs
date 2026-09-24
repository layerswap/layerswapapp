import assert from 'node:assert/strict'
import test, { after } from 'node:test'
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
  export const useSwapDataState = () => ({ swapDetails: { id: 'swap-1' }, depositActionsResponse: [
    { type: 'transfer', to_address: 'deposit', call_data: '0x' }
  ] })
  export const useSwapDataUpdate = () => ({ setSwapId() {}, createSwap() { throw new Error('unexpected creation') } })
  export const useSettingsState = () => ({ networks: [], sourceRoutes: [] })
  export const useInitialSettings = () => ({})
  export const useWalletWithdrawalState = () => ({ onWalletWithdrawalSuccess() { throw new Error('unexpected success') } })
  export const useSelectedAccount = () => ({ id: 'wallet', address: 'source' })
  export default () => ({ wallets: [{ id: 'wallet', address: 'source', providerName: 'test-wallet' }] })
  export const useTransfer = () => ({ executeTransfer: async () => { throw state.error } })
  export const useCallbacks = () => ({ onSwapLifecycle: event => state.events.push(event) })
  export const ErrorHandler = event => state.errors.push(event)
  export const BackendTransactionStatus = { Pending: 'pending' }
  export const useSwapTransactionStore = { getState: () => ({ setSwapTransaction() { throw new Error('unexpected submission') } }) }
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
        assert.equal(state.errors.length, outcome === 'failed' ? 1 : 0)
        await act(async () => result.handleWithdraw())
        const retries = state.events.filter(event => event.step === 'retry_requested')
        assert.equal(retries.length, 1)
        assert.equal(retries[0].reasonCode, outcome === 'rejected' ? 'user_rejected' : 'provider_withdrawal_failed')
      } finally {
        await act(async () => root.unmount())
      }
    })
  }
}
