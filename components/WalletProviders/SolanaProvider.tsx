import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { SolanaWalletConnectAdapter } from "@/lib/wallets/solana/SolanaWalletConnectAdapter";
import { WALLETCONNECT_PROJECT_ID, WALLETCONNECT_METADATA } from "@/lib/wallets/walletConnect/config";

const SOLANA_NETWORK = process.env.NEXT_PUBLIC_API_VERSION == 'sandbox' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

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
                    network: SOLANA_NETWORK,
                    options: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                        metadata: WALLETCONNECT_METADATA,
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
