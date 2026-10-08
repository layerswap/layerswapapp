import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const noop = () => {}

// Run the real swap provider and its SWR receipt subscription, with unrelated
// quote, route, wallet and whole-swap services held at deterministic boundaries.
export function createSwapContext({ Client, getSwapId, getAccount, stores, swapTransactions = {}, swr = require('swr'), authorizationHook = () => ({}), getSwapData, dependencies = {} }) {
    const network = { name: 'BASE_MAINNET' }
    const snapshots = new Map()
    const store = state => Object.assign(selector => selector(state), { getState: () => state })
    const emptyStores = {
        useSwapTransactionStore: store({ swapTransactions, pendingSubmissions: {}, setSwapTransaction: noop, markSubmissionPending: noop, clearPendingSubmission: noop }),
        useGaslessAuthorizationStore: store({ authorizations: {}, recordGaslessTransactionHash: noop }),
        useDepositSignatureStore: store({ signatures: {}, removeDepositSignature: noop }),
    }
    const resolved = {}
    const imports = {
        '@/helpers/depository': { shouldUseDepository: () => false },
        react: React,
        'react/jsx-runtime': require('react/jsx-runtime'),
        swr,
        '@layerswap/widget-types': { SwapStatus: { Created: 'created', UserTransferPending: 'user_transfer_pending' } },
        '@/lib/apiClients/layerSwapApiClient': {
            default: Client,
            BackendTransactionStatus: { Completed: 'completed', Pending: 'pending', Failed: 'failed' },
            TransactionType: { Input: 'input' },
            TransactionStatus: { Pending: 'pending', Completed: 'completed', Failed: 'failed' },
        },
        './settings': {
            useInitialSettings: () => ({ swapId: getSwapId() }),
            useSettingsState: () => ({ sourceRoutes: [], destinationRoutes: [], networks: [] }),
        },
        '@/hooks/useWallet': { default: () => ({ wallets: [{
            ...getAccount(), asSourceSupportedNetworks: [network.name],
        }] }) },
        './swapAccounts': { useSelectedAccount: getAccount },
        '@/hooks/useFee': { transformSwapDataToQuoteArgs: noop, useQuoteData: () => ({}) },
        '@/stores/recentRoutesStore': { useRecentNetworksStore: store({ updateRecentNetworks: noop }) },
        '@/stores/slippageStore': { useSlippageStore: store({}) },
        './callbackProvider': { useCallbacks: () => ({ onSwapCreate: noop, onSwapLifecycle: noop }) },
        '@/lib/address/Address': { Address: { equals: (a, b) => a === b } },
        '@/stores': stores ?? emptyStores,
        '@/helpers/depositActions': { isDepositWorkflowComplete: () => false },
        '@/helpers/swapProgress': { hasSwapExecutionProgress: () => false },
        '@/components/utils/resolveSwapPhase': { resolveSwapPhase: () => resolved },
        './depositSettings': { useDepositSettings: () => ({ isDepositFlow: false }) },
        '@/hooks/useGaslessAuthorization': { useGaslessAuthorization: () => ({}) },
        '@/stores/contractAddressStore': { useContractAddressStore: () => ({}) },
        '@/hooks/useExtendedSwapDisplay': { useExtendedSwapData: noop },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore: store({ gaslessEnabled: false }) },
        '@/helpers/gasless': { isGaslessAuthorizationSubmitted: () => false, isGaslessDepositWorkflow: () => false },
        '@/helpers/swapKeys': { depositActionsKey: (id, address) => `/swaps/${id}/deposit_actions${address ? '?source_address=' + encodeURIComponent(address) : ''}` },
        '@/hooks/useGaslessAuthorizationStatus': { useGaslessAuthorizationStatus: authorizationHook },
        '@/lib/extendedRoutes/registry': {},
        '@/lib/extendedRoutes/transforms': {},
        '@/stores/extendedRoutesStore': {},
        '@/helpers/swapFlow': { isDepositAddressSwap: () => false },
        '@/hooks/useSwapPolling': { useSwapPolling: id => {
            if (getSwapData) return { data: getSwapData(id), mutate: noop }
            if (!snapshots.has(id)) snapshots.set(id, { data: { swap: {
                id, source_network: network, source_token: {}, destination_network: network,
                destination_token: {}, requested_amount: '1', transactions: [], use_deposit_address: false,
            } } })
            return { data: id ? snapshots.get(id) : undefined, mutate: noop }
        } },
        '@/hooks/useSwapStatusNotification': { useSwapStatusNotification: noop },
        '@/lib/swapLifecycle': {},
        '@/lib/swapCreation': {},
        ...dependencies,
    }
    const loadSource = path => {
        const { outputText } = ts.transpileModule(readFileSync(new URL('../../src/' + path, import.meta.url), 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
        })
        const module = { exports: {} }
        new Function('require', 'module', 'exports', outputText)(name => {
            if (name in imports) return imports[name]
            throw new Error(`Unexpected swap context dependency: ${name}`)
        }, module, module.exports)
        return module.exports
    }
    imports['@/hooks/useInputTransactionStatus'] = loadSource('hooks/useInputTransactionStatus.ts')
    return loadSource('context/swap.tsx')
}
