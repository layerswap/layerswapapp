import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";
import { GlowWalletAdapter } from "@solana/wallet-adapter-glow";
import { NightlyWalletAdapter } from "@solana/wallet-adapter-nightly";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { ReactNode, useMemo } from "react";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

function SolanaProvider({ children }: { children: ReactNode }) {
    const solNetwork = WalletAdapterNetwork.Mainnet;
    const endpoint = useMemo(() => clusterApiUrl(solNetwork), [solNetwork]);
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new CoinbaseWalletAdapter(),
            new GlowWalletAdapter(),
            new NightlyWalletAdapter(),
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
            <WalletProvider wallets={wallets} autoConnect={false}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default SolanaProvider;