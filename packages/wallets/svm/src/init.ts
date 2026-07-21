import { AppSettings, isMobile } from '@layerswap/widget/internal'
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
        // The official adapter inherits `autoConnect() { await this.connect() }`,
        // and its connect() opens the WalletConnect modal whenever no session
        // exists — on the restore-selection path that's an unsolicited modal on
        // page load (e.g. returning after session expiry). The adapter exposes
        // no way to probe for a resumable session without that side effect, so
        // opt it out of auto-connect entirely; reconnecting always goes through
        // an explicit user-initiated connect(). (The pre-refactor SVMProvider
        // gated this adapter out of auto-connect the same way; our own
        // SolanaWalletConnectAdapter instead overrides autoConnect to resume
        // only when a session already exists.)
        class ManualConnectWalletConnectAdapter extends WalletConnectWalletAdapter {
            async autoConnect(): Promise<void> {
                // Intentionally empty — see class comment.
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
            new ManualConnectWalletConnectAdapter({
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
