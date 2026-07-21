import { isMobile } from "@layerswap/utils"
import { AppSettings } from "@layerswap/utils";
import { WalletAdapterNetwork, WalletReadyState } from '@solana/wallet-adapter-base'
import { svmAdapterManager } from './service/svmAdapterManager'
import { SolanaWalletConnectAdapter } from './connectors/SolanaWalletConnectAdapter'
import { getWalletConnectConfig, setWalletConnectConfig } from './service/walletConnectConfig'
import type { WalletConnectConfig } from '.'

let _initialized = false
let _loadPromise: Promise<void> | null = null

type InitOptions = {
    walletConnectConfigs?: WalletConnectConfig
}

/**
 * One-shot initialization of the Solana adapters + manager.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initSvmProvider(opts: InitOptions = {}): void {
    if (opts.walletConnectConfigs) {
        setWalletConnectConfig(opts.walletConnectConfigs)
    }

    if (_initialized || _loadPromise) return
    if (typeof window === 'undefined') return

    _loadPromise = (async () => {
        const adaptersModule = await import('@solana/wallet-adapter-wallets')
        const {
            NightlyWalletAdapter,
            PhantomWalletAdapter,
            SolflareWalletAdapter,
            BitgetWalletAdapter,
            TrustWalletAdapter,
            LedgerWalletAdapter,
            WalletConnectWalletAdapter
        } = adaptersModule
        class LoadablePhantomAdapter extends PhantomWalletAdapter {
            get readyState() {
                const rs = super.readyState;
                return rs === WalletReadyState.NotDetected && isMobile() ? WalletReadyState.Loadable : rs;
            }
        }
        const solNetwork = AppSettings.ApiVersion == 'testnet'
            ? WalletAdapterNetwork.Devnet
            : WalletAdapterNetwork.Mainnet

        const walletConnectConfigs = getWalletConnectConfig()

        const wcMetdata = {
            name: walletConnectConfigs?.name || 'Layerswap',
            description: walletConnectConfigs?.description || 'Layerswap App',
            url: walletConnectConfigs?.url || 'https://layerswap.io/app/',
            icons: walletConnectConfigs?.icons || ['https://www.layerswap.io/app/symbol.png'],
        }

        svmAdapterManager.register([
            new LoadablePhantomAdapter(),
            new NightlyWalletAdapter(),
            new SolflareWalletAdapter(),
            new BitgetWalletAdapter(),
            new TrustWalletAdapter(),
            new LedgerWalletAdapter(),
            new SolanaWalletConnectAdapter({
                network: solNetwork,
                options: {
                    projectId: walletConnectConfigs?.projectId,
                    metadata: wcMetdata,
                },
            }),
            new WalletConnectWalletAdapter({
                network: solNetwork,
                options: {
                    projectId: walletConnectConfigs?.projectId,
                    metadata: wcMetdata,
                    customStoragePrefix: 'officialSolanaWalletConnect',
                }
            })
        ])

        _initialized = true
    })()

    _loadPromise.catch(() => {
        _loadPromise = null
    })
}

/** Visible for tests. Resets singleton init so a fresh init can run. */
export function _resetSvmInit(): void {
    _initialized = false
    _loadPromise = null
    svmAdapterManager.dispose()
}
