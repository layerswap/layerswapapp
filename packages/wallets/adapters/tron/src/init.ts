import { connectModalStore, retryChunkLoad } from '@layerswap/wallet-core'
import { tronAdapterManager } from './service/tronAdapterManager'

let _initialized = false
let _loadPromise: Promise<void> | null = null

/**
 * One-shot initialization of the Tron adapters + manager.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Adapter loading is browser-only and runs once per session.
 */
export function initTronProvider(): void {
    if (_initialized || _loadPromise) return
    if (typeof window === 'undefined') return

    _loadPromise = (async () => {
        const [
            metamaskModule,
            tronLinkModule,
            okxModule,
            bitkeepModule,
            bybitModule,
            gateModule,
            trustModule,
        ] = await Promise.all([
            retryChunkLoad(() => import('@tronweb3/tronwallet-adapter-metamask-tron')),
            retryChunkLoad(() => import('@tronweb3/tronwallet-adapter-tronlink')),
            retryChunkLoad(() => import('@tronweb3/tronwallet-adapter-okxwallet')),
            retryChunkLoad(() => import('@tronweb3/tronwallet-adapter-bitkeep')),
            retryChunkLoad(() => import('@tronweb3/tronwallet-adapter-bybit')),
            retryChunkLoad(() => import('@tronweb3/tronwallet-adapter-gatewallet')),
            retryChunkLoad(() => import('@tronweb3/tronwallet-adapter-trust')),
        ])

        const { MetaMaskAdapter } = metamaskModule
        const { TronLinkAdapter } = tronLinkModule
        const { OkxWalletAdapter } = okxModule
        const { BitKeepAdapter } = bitkeepModule
        const { BybitWalletAdapter } = bybitModule
        const { GateWalletAdapter } = gateModule
        const { TrustAdapter } = trustModule

        tronAdapterManager.register([
            new MetaMaskAdapter(),
            new TronLinkAdapter(),
            new OkxWalletAdapter(),
            new BitKeepAdapter(),
            new BybitWalletAdapter(),
            new GateWalletAdapter(),
            new TrustAdapter()
        ])

        _initialized = true
    })()

    _loadPromise.catch((error) => {
        // Reset so the next init call retries; without the log a failed
        // adapter import leaves Tron silently missing from the modal.
        console.error('[layerswap/wallets] Tron provider initialization failed', error)
        _loadPromise = null
    })
}

/** Retries a failed initialization whenever the connect modal is open, so the user can recover without a reload. */
export function retryTronInitOnModalOpen(): () => void {
    const isModalOpen = () => connectModalStore.getSnapshot().isWalletModalOpen
    return connectModalStore.subscribe(() => {
        if (!isModalOpen()) {
            return
        }
        if (!_loadPromise) {
            initTronProvider()
            return
        }
        // A load is already running: retry once if it fails while the modal is still open.
        _loadPromise.catch(() => {
            if (isModalOpen()) {
                initTronProvider()
            }
        })
    })
}

/** Visible for tests. Resets singleton init so a fresh init can run. */
export function _resetTronInit(): void {
    _initialized = false
    _loadPromise = null
    tronAdapterManager.dispose()
}
