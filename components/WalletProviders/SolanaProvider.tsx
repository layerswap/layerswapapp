import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { WalletAdapterNetwork, WalletReadyState } from "@solana/wallet-adapter-base";
import { SolanaWalletConnectAdapter } from "@/lib/wallets/solana/SolanaWalletConnectAdapter";
import { WALLETCONNECT_PROJECT_ID, WALLETCONNECT_METADATA } from "@/lib/wallets/walletConnect/config";
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile";

const SOLANA_NETWORK = process.env.NEXT_PUBLIC_API_VERSION == 'sandbox' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

const shouldAutoConnect = async (adapter: { name: string }) => adapter.name !== 'WalletConnect';

function SolanaProvider({ children }: { children: ReactNode }) {
    const [adapters, setAdapters] = useState<any[]>([]);
    const [ready, setReady] = useState(false);
    const endpoint = useMemo(() => (
        SOLANA_NETWORK === WalletAdapterNetwork.Devnet
            ? "https://api.devnet.solana.com"
            : "https://api.mainnet-beta.solana.com"
    ), []);

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

            class MobilePhantomWalletAdapter extends PhantomWalletAdapter {
                get readyState() {
                    const rs = super.readyState;
                    return rs === WalletReadyState.NotDetected && isMobile() ? WalletReadyState.Loadable : rs;
                }
            }

            setReady(true);
            setAdapters([
                new MobilePhantomWalletAdapter(),
                new NightlyWalletAdapter(),
                new SolflareWalletAdapter(),
                new BitgetWalletAdapter(),
                new TrustWalletAdapter(),
                new LedgerWalletAdapter(),
                new SolanaWalletConnectAdapter({
                    network: SOLANA_NETWORK,
                    options: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                        metadata: WALLETCONNECT_METADATA,
                    }
                }),
                new WalletConnectWalletAdapter({
                    network: SOLANA_NETWORK,
                    options: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                        metadata: WALLETCONNECT_METADATA,
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
