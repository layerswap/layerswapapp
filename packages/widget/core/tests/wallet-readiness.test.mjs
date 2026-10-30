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
  export const SendTransactionButton = () => createElement('button', null, 'Send transaction')
  export const WalletIcon = () => null
  export const ActionMessage = () => null
  export const useActionMessage = () => null
  export const useSwapDataUpdate = () => ({ reportWalletActionFeedback: () => () => {} })
  export const useWalletWithdrawalState = () => ({ showProgress: false })
  export const useConnectWalletController = () => ({})
  export const useConnectModal = () => ({})
  export const useSendTransactionController = () => ({})
  export const getSendTransactionPresentation = () => ({ controls: createElement('button', null, 'Send transaction') })
  export const ConnectWalletView = () => createElement('button', null, 'Connect wallet')
  export const ProgressPanelView = () => null
  export const getWalletProgress = () => null
  export const ActionMessages = { DifferentAccountsNotAllowedError: () => createElement('p', null, 'Accounts must match') }
  export const useBalance = () => ({ balances: [] })
  export const useTransfer = () => ({})
  export const useGasless = () => ({ isGaslessSupported: () => false })
  export const useRpcHealth = (_, enabled) => {
    state.rpcEnabled = enabled
    return state.rpcUnhealthy ? { health: { status: 'unhealthy', reason: 'RPC probe failed' } } : undefined
  }
  export const isExtendedSourceNetwork = () => false
  export const ProviderWalletWithdrawal = () => null
  export const useWithdrawalProvider = () => undefined
`)}`
const mockedDependencies = [
  '/context/withdrawalContext', '/hooks/useWallet', '/context/swapAccounts',
  '/context/swap', '/Common/buttons', '/context/settings',
  '/lib/balances/useBalance', '/Common/actionMessage', '/messages/TransactionMessages',
  '/hooks/useTransfer', '/hooks/useGasless', '/context/rpcHealthContext',
  '/RPCUnhealthyMessage', '/lib/extendedRoutes/registry',
  '/hooks/useWithdrawalProvider', '/WithdrawalProviders/ProviderWalletWithdrawal', '/Presentation/WalletActionsView', '/Presentation/ProgressPanelView', '/Presentation/walletProgress',
]
// Mocks apply only to imports made by the component under test. If that file
// moves, update this path or the real wallet SDKs will load unmocked.
// The real readiness predicate, without the wallet-core barrel that would pull in every SDK.
const providerReadinessUrl = new URL('../../../wallets/core/dist/esm/lib/providerReadiness.js', import.meta.url).href
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith('/helpers/swapProgress.js') && specifier.endsWith('/lib/apiClients/layerSwapApiClient')) {
      return { url: 'data:text/javascript,export const TransactionType = { Input: "input" }; export const BackendTransactionStatus = { Failed: "failed" };', shortCircuit: true }
    }
    if (['/TransferBlock.js', '/useHasSubmittedTransfer.js'].some(path => context.parentURL?.endsWith(path)) && specifier.endsWith('/context/swap')) return { url: mockUrl, shortCircuit: true }
    if (context.parentURL?.endsWith('/components/Pages/Swap/Withdraw/Wallet/index.js')) {
      if (specifier.endsWith('/RPCUnhealthyMessage')) return { url: 'data:text/javascript,export default () => %22RPC unhealthy%22', shortCircuit: true }
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
const { useSwapTransactionStore } = await import('../dist/esm/stores/swapTransactionStore.js')
const { TransferBlock } = await import('../dist/esm/components/Pages/Swap/Withdraw/TransferBlock.js')
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
  state.swapState = { swapBasicData, swapDetails: { id: 'swap-readiness' } }
  state.initialSettings = {}
  state.rpcUnhealthy = false
  useSwapTransactionStore.setState({ swapTransactions: {}, pendingSubmissions: {} })
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
  state.swapState = { swapBasicData, swapDetails: { id: 'swap-readiness', source_address: 'restored-source' } }
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

for (const reason of ['rpc_unhealthy', 'wallet_unsupported_for_network', 'same_account_required']) {
  for (const receipt of ['hash', 'accepted-without-hash', 'pending']) {
    test(`${reason} cannot replace execution controls while ${receipt} exists`, async () => {
      state.account = { ...state.account, provider: { id: 'selected-provider', ready: true } }
      state.walletState.wallets = [{ id: 'selected-wallet', withdrawalSupportedNetworks: [sourceNetwork.name] }]
      if (reason === 'rpc_unhealthy') state.rpcUnhealthy = true
      if (reason === 'wallet_unsupported_for_network') state.walletState.wallets = []
      if (reason === 'same_account_required') state.initialSettings.sameAccountNetwork = sourceNetwork.name
      const id = state.swapState.swapDetails.id
      const transaction = receipt === 'hash'
        ? { kind: 'wallet-transfer', hash: '0xsubmitted' }
        : { kind: 'wallet-transfer', providerSubmissionAccepted: true }
      useSwapTransactionStore.setState(receipt === 'pending'
        ? { pendingSubmissions: { [id]: true } }
        : { swapTransactions: { [id]: transaction } })
      await render()
      assert.equal(container.textContent, 'Send transaction', 'existing execution controls remain rendered')
      assert.deepEqual(events, [], 'hidden readiness branches must not emit block events')
      assert.equal(state.rpcEnabled, false, 'submission observation must not require a healthy wallet RPC')

      // Prove the same readiness condition is a real UI block once reconciliation
      // establishes there is no outstanding submission.
      await act(() => useSwapTransactionStore.setState({ swapTransactions: {}, pendingSubmissions: {} }))
      await render()
      const expectedText = reason === 'rpc_unhealthy' ? 'RPC unhealthy'
        : reason === 'same_account_required' ? 'Accounts must match' : 'Connect wallet'
      assert.equal(container.textContent, expectedText)
      assert.deepEqual(events.map(event => event.reasonCode), [reason])
      if (reason === 'rpc_unhealthy') assert.equal(events[0].reason, 'RPC probe failed')
    })
  }
}

function renderBoundary({ key = 'block', visible = true, reasonCode = 'rpc_unhealthy', reason = 'RPC probe failed' } = {}) {
  return act(() => root.render(createElement(StrictMode, null,
    createElement(CallbackProvider, { callbacks: { onSwapLifecycle: event => events.push(event) } },
      visible ? createElement(TransferBlock, { key, reasonCode, reason, path: 'BoundaryTest' },
        createElement('p', null, reasonCode)) : null),
  )))
}

test('remounted boundaries report once per mount without StrictMode duplicates', async () => {
  await renderBoundary()
  await renderBoundary()
  assert.equal(events.length, 1, 'rerenders and StrictMode replay do not repeat a mounted block')
  await renderBoundary({ key: 'remounted' })
  assert.equal(events.length, 2, 'transfer_blocked is repeatable for a newly mounted blocking screen')
  await renderBoundary({ visible: false })
  assert.equal(events.length, 2, 'unmounting does not emit a block')
  await renderBoundary({ key: 'returned' })
  await renderBoundary({ key: 'returned' })
  assert.equal(container.textContent, 'rpc_unhealthy')
  assert.deepEqual(events.map(event => event.reasonCode), ['rpc_unhealthy', 'rpc_unhealthy', 'rpc_unhealthy'])
})

test('changing a mounted boundary reason reports the new visible block once', async () => {
  await renderBoundary()
  await renderBoundary({ reasonCode: 'gasless_unavailable', reason: 'Paymaster unavailable' })
  await renderBoundary({ reasonCode: 'gasless_unavailable', reason: 'Paymaster unavailable' })
  assert.equal(container.textContent, 'gasless_unavailable')
  assert.deepEqual(events.map(event => [event.reasonCode, event.reason]), [
    ['rpc_unhealthy', 'RPC probe failed'],
    ['gasless_unavailable', 'Paymaster unavailable'],
  ])
})

test('the same mounted block is recorded independently for a replacement swap', async () => {
  await renderBoundary()
  state.swapState = { ...state.swapState, swapDetails: { id: 'second-swap' } }
  await renderBoundary()
  await renderBoundary()
  assert.deepEqual(events.map(event => event.swapId), ['swap-readiness', 'second-swap'])
})

test('a draft receiving its first swap ID does not repeat the block', async () => {
  state.swapState = { swapBasicData }
  await renderBoundary()
  state.swapState = { swapBasicData, swapDetails: { id: 'created-swap' } }
  await renderBoundary()
  state.swapState = { ...state.swapState, swapDetails: { id: 'created-swap', source_address: 'late-address' } }
  await renderBoundary()
  assert.equal(events.length, 1)
})

test('returning from a swap to a draft rearms the mounted block', async () => {
  await renderBoundary()
  state.swapState = { swapBasicData }
  await renderBoundary()
  assert.deepEqual(events.map(event => event.swapId), ['swap-readiness', undefined])
})
