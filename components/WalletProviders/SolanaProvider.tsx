import { clusterApiUrl } from "@solana/web3.js";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { NightlyWalletAdapter, WalletConnectWalletAdapter, PhantomWalletAdapter, CoinbaseWalletAdapter, SolflareWalletAdapter, BitgetWalletAdapter, TrustWalletAdapter, LedgerWalletAdapter, HuobiWalletAdapter } from "@solana/wallet-adapter-wallets";
import { ReactNode, useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

function SolanaProvider({ children }: { children: ReactNode }) {
    const solNetwork = WalletAdapterNetwork.Mainnet;
    const endpoint = useMemo(() => clusterApiUrl(solNetwork), [solNetwork]);
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new CoinbaseWalletAdapter(),
            new NightlyWalletAdapter(),
            new SolflareWalletAdapter(),
            new BitgetWalletAdapter(),
            new TrustWalletAdapter(),
            new LedgerWalletAdapter(),
            new HuobiWalletAdapter(),
            new WalletConnectWalletAdapter({
                network: solNetwork,
                options: {
                    projectId: WALLETCONNECT_PROJECT_ID,
                    metadata: {
                        name: 'Layerwap',
                        description: 'Layerswap App',
                        url: 'https://layerswap.io/app/',
                        icons: ['https://www.layerswap.io/app/symbol.png'],
                    },
                },
            })
        ],
        [solNetwork]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={true}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default SolanaProvider;
