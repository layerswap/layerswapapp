import { clusterApiUrl } from "@solana/web3.js";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { ReactNode, useMemo, useState, useEffect } from "react";
import { WalletAdapterNetwork, WalletReadyState } from "@solana/wallet-adapter-base";
import { useWalletConnectConfig, WalletConnectConfig } from ".";
import { AppSettings, isMobile } from "@layerswap/widget/internal";
import type { ReactElement } from "react";
import { SolanaHiddenWalletConnectName, SolanaWalletConnectAdapter } from "./connectors/SolanaWalletConnectAdapter";

type SolanaProviderProps = {
    children: ReactNode
    walletConnectConfigs?: WalletConnectConfig
}
const shouldAutoConnect = async (adapter: { name: string; canAutoConnect?: () => Promise<boolean> }) => {
    if (adapter.name === 'WalletConnect') return false
    if (adapter.name === SolanaHiddenWalletConnectName) return adapter.canAutoConnect?.() ?? false
    return true
};

function SolanaProvider({ children }: SolanaProviderProps): ReactElement {
    const [adapters, setAdapters] = useState<any[]>([]);
    const [ready, setReady] = useState(false);
    const walletConnectConfigs = useWalletConnectConfig();
    const WALLETCONNECT_PROJECT_ID = walletConnectConfigs?.projectId

    const solNetwork = AppSettings.ApiVersion == 'testnet' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;;
    const endpoint = useMemo(() => clusterApiUrl(solNetwork), [solNetwork]);

    const wcMetdata = {
        name: walletConnectConfigs?.name || 'Layerswap',
        description: walletConnectConfigs?.description || 'Layerswap App',
        url: walletConnectConfigs?.url || 'https://layerswap.io/app/',
        icons: walletConnectConfigs?.icons || ['https://www.layerswap.io/app/symbol.png'],
    }

    useEffect(() => {
        let cancelled = false;

        const loadAdapters = async () => {
            const adaptersModule = await import("@solana/wallet-adapter-wallets");
            const {
                NightlyWalletAdapter,
                PhantomWalletAdapter,
                SolflareWalletAdapter,
                BitgetWalletAdapter,
                TrustWalletAdapter,
                LedgerWalletAdapter,
                WalletConnectWalletAdapter,
            } = adaptersModule;

            if (cancelled) return;

            class LoadablePhantomAdapter extends PhantomWalletAdapter {
                get readyState() {
                    const rs = super.readyState;
                    return rs === WalletReadyState.NotDetected && isMobile() ? WalletReadyState.Loadable : rs;
                }
            }

            setReady(true);
            setAdapters([
                new LoadablePhantomAdapter(),
                new NightlyWalletAdapter(),
                new SolflareWalletAdapter(),
                new BitgetWalletAdapter(),
                new TrustWalletAdapter(),
                new LedgerWalletAdapter(),
                new SolanaWalletConnectAdapter({
                    network: solNetwork,
                    options: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                        metadata: wcMetdata,
                    }
                }),
                new WalletConnectWalletAdapter({
                    network: solNetwork,
                    options: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                        metadata: wcMetdata,
                        customStoragePrefix: 'officialSolanaWalletConnect',
                    }
                }),
            ]);
        };

        loadAdapters().catch(() => {
            // Keep provider mounted even if adapter loading fails.
            setAdapters([]);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={adapters} autoConnect={ready ? shouldAutoConnect : false}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default SolanaProvider;
