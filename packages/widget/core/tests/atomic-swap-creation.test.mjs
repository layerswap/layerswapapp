import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import React, { act, createElement } from 'react'
import { createSwapContext } from './helpers/swap-context.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.test' })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })
const { createRoot } = await import('react-dom/client')
const address = `0x${'1'.repeat(40)}`
const network = { name: 'ARBITRUM_MAINNET', type: 'evm', chain_id: '42161' }
const token = { symbol: 'ARB', contract: `0x${'2'.repeat(40)}` }
const store = state => Object.assign(selector => selector(state), { getState: () => state })

for (const [lane, capability, expected] of [
  ['erc20', 'supported', true], ['erc20', 'ready', false], ['erc20', 'unsupported', false],
  ['rpc-error', 'supported', false], ['native', 'supported', false], ['gasless', 'supported', false],
  ['deposit-address', 'supported', false], ['inactive-wallet', 'supported', false], ['explicit-standard', 'supported', false],
  ['failed-batch-retry', 'supported', false],
]) test(`swap creation negotiates batching for ${lane} / ${capability}`, async () => {
  const requests = [], queries = []
  const sourceToken = lane === 'native' ? { ...token, contract: null } : token
  const wallet = { id: 'wallet', address, isActive: lane !== 'inactive-wallet', providerName: 'EVM' }
  const snapshot = { data: { data: { swap: { id: 'seed', transactions: [], source_network: network, destination_network: network,
    source_token: sourceToken, destination_token: { symbol: 'AAVE' }, requested_amount: '1', use_deposit_address: false } } } }
  const context = createSwapContext({
    Client: class { async CreateSwapAsync(request) { requests.push(request); return { data: { swap: { id: 'created' } } } } },
    getSwapId: () => 'seed', getAccount: () => wallet,
    swr: { __esModule: true, default: () => ({}) },
    dependencies: {
      '@/hooks/useWallet': { default: () => ({ wallets: [{ ...wallet, asSourceSupportedNetworks: [network.name] }] }) },
      '@/stores/contractAddressStore': { useContractAddressStore: () => ({ checkContractStatus: async () => ({ sourceIsContract: false }) }) },
      '@/hooks/useSwapPolling': { useSwapPolling: () => snapshot },
      '@/stores/walletBatchStore': { useWalletBatchStore: store({ batches: lane === 'failed-batch-retry'
        ? { seed: { state: 'failed', standardNextAttempt: true } } : {} }), isBatchOutstanding: () => false },
      '@/lib/swapCreation': { createSwapAttempt: async prepare => { const attempt = await prepare(); return (await attempt.request()).data } },
      '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
      '@/hooks/useAtomicBatchCapability': { useAtomicBatchCapability() {}, getAtomicBatchCapability: async (...args) => {
        queries.push(args)
        if (lane === 'rpc-error') return 'unsupported'
        return capability
      } },
      '@/helpers/gasless': { isGaslessCapableRoute: () => lane === 'gasless' },
      '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore: store({ gaslessEnabled: lane === 'gasless' }) },
      '@/helpers/swapFlow': { isDepositAddressSwap: () => false, isDepositAddressFlow: method => method === 'deposit_address', wantsFrontendSwap: () => true },
      '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
      '@layerswap/utils': { KnownInternalNames: { Networks: {} } },
    },
  })
  let update
  function Capture() { update = context.useSwapDataUpdate(); return null }
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await act(async () => root.render(createElement(context.SwapDataProvider, null, createElement(Capture))))
    await act(async () => {
      if (lane === 'failed-batch-retry') update.startFreshSwapAttempt()
      return update.createSwap({ from: network, to: network, fromAsset: sourceToken, toAsset: { symbol: 'AAVE' },
      amount: '1', destination_address: address, depositMethod: lane === 'deposit-address' ? 'deposit_address' : 'wallet' }, {}, undefined,
      { useAtomicBatch: lane === 'explicit-standard' ? false : undefined })
    })
    assert.equal(requests[0].use_atomic_batch, expected)
    assert.equal(requests[0].use_gasless, lane === 'gasless')
    assert.equal(queries.length, ['erc20', 'rpc-error'].includes(lane) ? 1 : 0)
  } finally { await act(async () => root.unmount()) }
})
