import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const noop = () => {}

// Run the real swap provider and its SWR receipt subscription, with unrelated
// quote, route, wallet and whole-swap services held at deterministic boundaries.
export function createSwapContext({ Client, getSwapId, getAccount, stores, swr = require('swr'), overrides = {} }) {
    const network = { name: 'BASE_MAINNET' }
    const snapshots = new Map()
    const store = state => Object.assign(selector => selector(state), { getState: () => state })
    const emptyStores = {
        useSwapTransactionStore: store({ swapTransactions: {}, setSwapTransaction: noop }),
        useGaslessAuthorizationStore: store({ authorizations: {} }),
        useDepositSignatureStore: store({ removeDepositSignature: noop }),
    }
    const resolved = {}
    const imports = {
        react: React,
        'react/jsx-runtime': require('react/jsx-runtime'),
        swr,
        '@/lib/apiClients/layerSwapApiClient': {
            default: Client,
            BackendTransactionStatus: { Completed: 'completed', Pending: 'pending' },
            TransactionType: { Input: 'input' },
        },
        './settings': {
            useInitialSettings: () => ({ swapId: getSwapId() }),
            useSettingsState: () => ({ sourceRoutes: [], destinationRoutes: [], networks: [] }),
        },
        '@/hooks/useWallet': { default: () => ({ wallets: [{
            ...getAccount(), addresses: getAccount().addresses ?? [getAccount().address], asSourceSupportedNetworks: [network.name],
        }] }) },
        './swapAccounts': { useSelectedAccount: getAccount },
        '@/hooks/useFee': { transformSwapDataToQuoteArgs: noop, useQuoteData: () => ({}) },
        '@/stores/recentRoutesStore': { useRecentNetworksStore: store({ updateRecentNetworks: noop }) },
        '@/stores/slippageStore': { useSlippageStore: store({}) },
        './callbackProvider': { useCallbacks: () => ({ onSwapCreate: noop, onSwapLifecycle: noop }) },
        '@/lib/address/Address': { Address: { equals: (a, b) => a === b } },
        '@/stores': stores ?? emptyStores,
        '@/helpers/depositActions': { isDepositWorkflowComplete: () => false },
        '@/components/utils/resolveSwapPhase': { resolveSwapPhase: () => resolved },
        './depositSettings': { useDepositSettings: () => ({ isDepositFlow: false }) },
        '@/hooks/useGaslessAuthorization': { useGaslessAuthorization: () => ({}) },
        '@/stores/contractAddressStore': { useContractAddressStore: () => ({}) },
        '@/hooks/useExtendedSwapDisplay': { useExtendedSwapData: noop },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore: store({ gaslessEnabled: false }) },
        '@/helpers/gasless': {},
        '@/lib/extendedRoutes/registry': {},
        '@/lib/extendedRoutes/transforms': {},
        '@/stores/extendedRoutesStore': {},
        '@/helpers/swapFlow': { isDepositAddressSwap: () => false },
        '@/hooks/useSwapPolling': { useSwapPolling: id => {
            if (!snapshots.has(id)) snapshots.set(id, { data: { swap: {
                id, source_network: network, source_token: {}, destination_network: network,
                destination_token: {}, requested_amount: '1', transactions: [], use_deposit_address: false,
            } } })
            return { data: id ? snapshots.get(id) : undefined, mutate: noop }
        } },
        '@/hooks/useSwapStatusNotification': { useSwapStatusNotification: noop },
        '@/hooks/useAtomicBatchTracking': { useAtomicBatchTracking: noop },
        '@/hooks/useAtomicBatchCapability': { useAtomicBatchCapability: () => false },
        '@/hooks/useClientLayoutEffect': { useClientLayoutEffect: React.useLayoutEffect },
        '@/stores/atomicBatchStore': { useAtomicBatchStore: store({ batches: {} }), getOutstandingBatch: noop, isBatchOutstanding: () => false },
        '@/helpers/atomicBatch': { isAtomicBatchEligible: () => false },
        '@/lib/resolvers/resolverService': {},
        '@/lib/swapLifecycle': {},
        '@/lib/swapCreation': {},
        '@layerswap/utils': { KnownInternalNames: {} },
        ...overrides,
    }
    const { outputText } = ts.transpileModule(readFileSync(new URL('../../src/context/swap.tsx', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name in imports) return imports[name]
        throw new Error(`Unexpected swap context dependency: ${name}`)
    }, module, module.exports)
    return module.exports
}
