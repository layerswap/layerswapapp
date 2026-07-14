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

// wagmi's `Connector.getProvider()` returns `Promise<unknown>` (the base
// interface can't know which wallet's provider you'll get). Narrow it to the
// EIP-1193 surface we actually use so `request(...)` is typed instead of `any`.
type Eip1193Provider = {
    request: (args: { method: string; params?: unknown[] }) => Promise<any>
}

const RPC_PROBE_TIMEOUT_MS = 8000

// Wallet in-app browsers (Rainbow, MetaMask mobile, etc.) and some WalletConnect
// sessions don't proxy arbitrary read methods like `eth_getBlockByNumber`; they
// reject with an "unsupported method" / "unauthorized" error that says nothing
// about RPC health. Treating those as unhealthy would show the (non-actionable)
// "add RPC" prompt inside wallet browsers even when the RPC is perfectly fine.
const UNSUPPORTED_METHOD_CODES = [
    4200, // EIP-1193: Unsupported Method
    4100, // EIP-1193: Unauthorized
    -32601, // JSON-RPC: Method not found
    -32004, // JSON-RPC: Method not supported
]
const UNSUPPORTED_METHOD_MESSAGES = [
    'not supported',
    'method not found',
    'unsupported method',
    'unauthorized',
    'does not exist',
    'not available',
]

function isMethodUnsupportedError(e: any): boolean {
    if (UNSUPPORTED_METHOD_CODES.includes(e?.code)) return true
    const msg = String(e?.message ?? '').toLowerCase()
    return UNSUPPORTED_METHOD_MESSAGES.some((m) => msg.includes(m))
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

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
            const provider = (await connector.getProvider()) as Eip1193Provider | null
            if (!provider || typeof provider.request !== 'function') return

            const start = performance.now()
            const latestBlock = await withTimeout(
                provider.request({
                    method: 'eth_getBlockByNumber',
                    params: ['latest', false],
                }),
                RPC_PROBE_TIMEOUT_MS,
                'Wallet RPC timed out',
            )
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
            // A wallet declining to serve the read method isn't an RPC health signal —
            // leave status "unknown" so we don't prompt the user to add an RPC.
            if (isMethodUnsupportedError(e)) {
                setSnapshot({ health: { status: undefined } satisfies RpcHealth })
                return
            }
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
            const provider = (await connector.getProvider()) as Eip1193Provider | null
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
