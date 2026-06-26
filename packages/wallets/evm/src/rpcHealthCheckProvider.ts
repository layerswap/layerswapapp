import type {
    AddEthereumChainParams,
    Network,
    RpcHealth,
    RpcHealthCheckProvider,
    RpcHealthCheckSnapshot,
    RpcHealthCheckStore,
    SuggestRpcResult,
} from '@layerswap/widget/types'
import { NetworkType } from '@layerswap/widget/types'
import { useEvmStore } from './service/evmStore'

const INITIAL_SNAPSHOT: RpcHealthCheckSnapshot = Object.freeze({
    health: { status: undefined } as RpcHealth,
    isSuggestingRpc: false,
})

function createStore(): RpcHealthCheckStore {
    let snapshot: RpcHealthCheckSnapshot = INITIAL_SNAPSHOT
    const listeners = new Set<() => void>()
    let lastConnectorId: string | undefined
    let lastIsConnected = false

    const setSnapshot = (next: Partial<RpcHealthCheckSnapshot>) => {
        snapshot = { ...snapshot, ...next }
        listeners.forEach(l => l())
    }

    const getActiveConnector = () => {
        const state = useEvmStore.getState()
        const isConnected = !!state.wagmiAccount.address
        const connector = state.allConnectors.find(c => c.id === state.wagmiAccount.connectorId)
        return { connector, isConnected, chainId: state.wagmiAccount.chainId }
    }

    const check = async () => {
        const { connector, isConnected } = getActiveConnector()
        if (!connector || !isConnected) return

        try {
            const provider: any = await connector.getProvider()
            if (!provider || typeof provider.request !== 'function') return

            const start = performance.now()
            const latestBlock = await provider.request({
                method: 'eth_getBlockByNumber',
                params: ['latest', false],
            })
            const latencyMs = performance.now() - start

            const tsHex = latestBlock?.timestamp
            const blockAgeSec = tsHex != null
                ? Date.now() / 1000 - parseInt(tsHex, 16)
                : Number.POSITIVE_INFINITY

            const tooSlow = latencyMs > 2000
            const tooStale = blockAgeSec > 60

            if (tooSlow || tooStale) {
                let reason = ''
                if (tooSlow) reason += `Wallet RPC is slow (${latencyMs.toFixed(0)}ms). `
                if (tooStale) reason += `Latest block is stale (${blockAgeSec.toFixed(0)}s old).`
                setSnapshot({ health: { status: 'unhealthy', reason: reason.trim() } satisfies RpcHealth })
                return
            }
            setSnapshot({ health: { status: 'healthy', latencyMs, blockAgeSec } satisfies RpcHealth })
        } catch (e: any) {
            const msg = e?.message || 'Unknown error from wallet RPC'
            setSnapshot({ health: { status: 'unhealthy', reason: msg } satisfies RpcHealth })
        }
    }

    const suggestRpc = async (params: AddEthereumChainParams): Promise<SuggestRpcResult> => {
        const { connector, isConnected } = getActiveConnector()
        if (!connector || !isConnected) {
            return { success: false, error: 'Wallet not connected' }
        }

        setSnapshot({ isSuggestingRpc: true })
        try {
            const provider: any = await connector.getProvider()
            if (!provider || typeof provider.request !== 'function') {
                return { success: false, error: 'No wallet provider available' }
            }
            await provider.request({
                method: 'wallet_addEthereumChain',
                params: [params],
            })
            await check()
            return { success: true }
        } catch (e: any) {
            return { success: false, error: e?.message || 'Failed to update wallet RPC' }
        } finally {
            setSnapshot({ isSuggestingRpc: false })
        }
    }

    const suggestRpcForCurrentChain = async (
        rpcUrl: string,
        chainDetails: Omit<AddEthereumChainParams, 'chainId' | 'rpcUrls'>,
    ): Promise<SuggestRpcResult> => {
        const { chainId } = getActiveConnector()
        if (!chainId) return { success: false, error: 'No chain connected' }
        return suggestRpc({
            chainId: `0x${chainId.toString(16)}`,
            rpcUrls: [rpcUrl],
            ...chainDetails,
        })
    }

    // Auto-check when the active connector or connectedness changes.
    const unsubEvm = useEvmStore.subscribe(() => {
        const { connector, isConnected } = getActiveConnector()
        const connectorId = connector?.id
        if (connectorId === lastConnectorId && isConnected === lastIsConnected) return
        lastConnectorId = connectorId
        lastIsConnected = isConnected
        if (connector && isConnected) void check()
    })

    return {
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        getSnapshot() {
            return snapshot
        },
        checkManually: check,
        suggestRpc,
        suggestRpcForCurrentChain,
        destroy() {
            unsubEvm()
            listeners.clear()
        },
    }
}

export class EVMRpcHealthCheckProvider implements RpcHealthCheckProvider {
    private _store: RpcHealthCheckStore | null = null

    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.EVM
    }

    createStore(): RpcHealthCheckStore {
        if (!this._store) this._store = createStore()
        return this._store
    }
}
