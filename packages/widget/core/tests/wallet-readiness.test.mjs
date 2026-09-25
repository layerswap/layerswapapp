import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.example' })
const globals = {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
}
const previousGlobals = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

// Keep wallet SDKs and presentation dependencies out of this regression while
// rendering the real withdrawal component, blocked-effect hook and host provider.
const mockUrl = `data:text/javascript,${encodeURIComponent(`
  import { createElement } from ${JSON.stringify(import.meta.resolve('react'))}
  export const state = {}
  export default function useWallet() { return state.walletState }
  export const useSelectedAccount = () => state.account
  export const useSwapDataState = () => state.swapState
  export const useInitialSettings = () => state.initialSettings
  export const useSettingsState = () => ({ networks: [] })
  export const WithdrawalProvider = ({ children }) => children
  export const ConnectWalletButton = () => createElement('button', null, 'Connect wallet')
  export const ChangeNetworkButton = () => createElement('button', null, 'Change network')
  export const SendTransactionButton = () => createElement('button', null, 'Send transaction')
  export const WalletIcon = () => null
  export const ActionMessage = () => null
  export const ActionMessages = { DifferentAccountsNotAllowedError: () => createElement('p', null, 'Accounts must match') }
  export const useBalance = () => ({ balances: [] })
  export const useTransfer = () => ({})
  export const useGasless = () => ({ isGaslessSupported: () => false })
  export const useRpcHealth = () => undefined
  export const isExtendedSourceNetwork = () => false
  export const HyperliquidWalletWithdraw = () => null
  export const PolymarketWalletWithdraw = () => null
`)}`
const mockedDependencies = [
  '/context/withdrawalContext', '/hooks/useWallet', '/context/swapAccounts',
  '/context/swap', '/Common/buttons', '/context/settings',
  '/lib/balances/useBalance', '/Common/actionMessage', '/messages/TransactionMessages',
  '/hooks/useTransfer', '/hooks/useGasless', '/context/rpcHealthContext',
  '/RPCUnhealthyMessage', '/lib/extendedRoutes/registry',
  '/WithdrawalProviders/Hyperliquid', '/WithdrawalProviders/Polymarket',
]
// Mocks apply only to imports made by the component under test. If that file
// moves, update this path or the real wallet SDKs will load unmocked.
// The real readiness predicate, without the wallet-core barrel that would pull in every SDK.
const providerReadinessUrl = new URL('../../../wallets/core/dist/esm/lib/providerReadiness.js', import.meta.url).href
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith('/components/Pages/Swap/Withdraw/Wallet/index.js')) {
      if (specifier === '@layerswap/wallet-core') return { url: providerReadinessUrl, shortCircuit: true }
      if (specifier === '@layerswap/ui-kit/components' || mockedDependencies.some(path => specifier.endsWith(path))) {
        return { url: mockUrl, shortCircuit: true }
      }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})

const { state } = await import(mockUrl)
const { createRoot } = await import('react-dom/client')
const { CallbackProvider } = await import('../dist/esm/context/callbackProvider.js')
const { WalletWithdrawal } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/index.js')
const sourceNetwork = { name: 'ETHEREUM_MAINNET', type: 'evm', chain_id: '1' }
const swapBasicData = {
  source_network: sourceNetwork,
  destination_network: { name: 'ARBITRUM_MAINNET', type: 'evm' },
  source_token: { symbol: 'ETH' },
  destination_token: { symbol: 'ETH' },
  destination_address: 'destination',
  requested_amount: '1',
  use_deposit_address: false,
}

let root
let container
let events
beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  events = []
  state.account = {
    id: 'selected-wallet', address: 'source', providerName: 'selected-provider',
    provider: { id: 'selected-provider', name: 'selected-provider', ready: false },
  }
  // The first provider supporting a network need not own the selected account.
  state.walletState = { wallets: [], provider: { id: 'other-provider', ready: true } }
  state.swapState = { swapDetails: { id: 'swap-readiness' } }
  state.initialSettings = {}
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
})
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of Object.keys(globals)) {
    if (previousGlobals[key]) Object.defineProperty(globalThis, key, previousGlobals[key])
    else delete globalThis[key]
  }
})

const render = () => act(() => root.render(createElement(StrictMode, null,
  createElement(CallbackProvider, { callbacks: { onSwapLifecycle: event => events.push(event) } },
    createElement(WalletWithdrawal, { swapBasicData, swapId: 'swap-readiness', refuel: false })),
)))

test('delayed restoration keeps connect available and never reports an unsupported wallet', async () => {
  for (const readiness of [
    { ready: false },
    { ready: true, isStub: true },
    { ready: true, pendingSessionRestore: true },
  ]) {
    state.account = { ...state.account, provider: { id: 'selected-provider', ...readiness } }
    await render()
    // Each act flushes the blocked hook's microtask before the next restore render.
    assert.deepEqual(events, [], JSON.stringify(readiness))
    assert.equal(container.textContent, 'Connect wallet')
    assert.equal(container.querySelector('button').disabled, false)
  }

  state.account = { ...state.account, provider: { id: 'selected-provider', ready: true } }
  state.walletState = { ...state.walletState, wallets: [{
    id: 'selected-wallet', providerName: 'selected-provider',
    withdrawalSupportedNetworks: [sourceNetwork.name], chainId: '1',
  }] }
  await render()
  assert.deepEqual(events, [])
  assert.equal(container.textContent, 'Send transaction')
})

test('a ready selected provider reports a truly unsupported wallet once regardless of another provider readiness', async () => {
  await render()
  assert.deepEqual(events, [])

  state.account = { ...state.account, provider: { id: 'selected-provider', ready: true } }
  state.walletState = { wallets: [], provider: { id: 'other-provider', ready: false } }
  await render()
  state.swapState = { swapDetails: { id: 'swap-readiness', source_address: 'restored-source' } }
  await render()
  await render()

  assert.equal(container.textContent, 'Connect wallet')
  assert.equal(events.length, 1)
  assert.equal(events[0].step, 'transfer_blocked')
  assert.equal(events[0].reasonCode, 'wallet_unsupported_for_network')
  assert.equal(events[0].swapId, 'swap-readiness')
})

test('provider restoration does not hide a definite same-account block', async () => {
  state.initialSettings = { sameAccountNetwork: sourceNetwork.name }
  await render()
  assert.equal(container.textContent, 'Accounts must match')
  assert.deepEqual(events.map(event => event.reasonCode), ['same_account_required'])
})
