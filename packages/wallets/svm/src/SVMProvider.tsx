import { clusterApiUrl } from "@solana/web3.js";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { ReactNode, useMemo, useState, useEffect } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useWalletConnectConfig, WalletConnectConfig } from ".";
import { AppSettings } from "@layerswap/widget/internal";
import type { ReactElement } from "react";
import { SolanaWalletConnectAdapter } from "./connectors/SolanaWalletConnectAdapter";

type SolanaProviderProps = {
    children: ReactNode
    walletConnectConfigs?: WalletConnectConfig
}

function SolanaProvider({ children }: SolanaProviderProps): ReactElement {
    const [adapters, setAdapters] = useState<any[]>([]);
    const [ready, setReady] = useState(false);
    const walletConnectConfigs = useWalletConnectConfig();
    const WALLETCONNECT_PROJECT_ID = walletConnectConfigs?.projectId

    const solNetwork = AppSettings.ApiVersion == 'sandbox' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;;
    const endpoint = useMemo(() => clusterApiUrl(solNetwork), [solNetwork]);
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
                LedgerWalletAdapter
            } = adaptersModule;

            if (cancelled) return;

            setReady(true);
            setAdapters([
                new PhantomWalletAdapter(),
                new NightlyWalletAdapter(),
                new SolflareWalletAdapter(),
                new BitgetWalletAdapter(),
                new TrustWalletAdapter(),
                new LedgerWalletAdapter(),
                new SolanaWalletConnectAdapter({
                    network: solNetwork,
                    options: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                        metadata: {
                            name: walletConnectConfigs?.name || 'Layerswap',
                            description: walletConnectConfigs?.description || 'Layerswap App',
                            url: walletConnectConfigs?.url || 'https://layerswap.io/app/',
                            icons: walletConnectConfigs?.icons || ['https://www.layerswap.io/app/symbol.png'],
                        },
                    }
                })
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
            <WalletProvider wallets={adapters} autoConnect={ready}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default SolanaProvider;
