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
        ] = await Promise.all([
            import('@tronweb3/tronwallet-adapter-metamask-tron'),
            import('@tronweb3/tronwallet-adapter-tronlink'),
            import('@tronweb3/tronwallet-adapter-okxwallet'),
            import('@tronweb3/tronwallet-adapter-bitkeep'),
            import('@tronweb3/tronwallet-adapter-bybit'),
            import('@tronweb3/tronwallet-adapter-gatewallet'),
        ])

        const { MetaMaskAdapter } = metamaskModule
        const { TronLinkAdapter } = tronLinkModule
        const { OkxWalletAdapter } = okxModule
        const { BitKeepAdapter } = bitkeepModule
        const { BybitWalletAdapter } = bybitModule
        const { GateWalletAdapter } = gateModule

        tronAdapterManager.register([
            new MetaMaskAdapter(),
            new TronLinkAdapter(),
            new OkxWalletAdapter(),
            new BitKeepAdapter(),
            new BybitWalletAdapter(),
            new GateWalletAdapter(),
        ])

        _initialized = true
    })()

    _loadPromise.catch(() => {
        _loadPromise = null
    })
}

/** Visible for tests. Resets singleton init so a fresh init can run. */
export function _resetTronInit(): void {
    _initialized = false
    _loadPromise = null
    tronAdapterManager.dispose()
}
