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
import { WalletConnectConfig } from ".";

type SolanaProviderProps = {
    children: ReactNode
    walletConnectConfigs?: WalletConnectConfig
}

function SolanaProvider({ children, walletConnectConfigs }: SolanaProviderProps) {
    const walletConnectConfig = walletConnectConfigs
    const WALLETCONNECT_PROJECT_ID = walletConnectConfig?.projectId

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
                        name: walletConnectConfig?.name || 'Layerwap',
                        description: walletConnectConfig?.description || 'Layerswap App',
                        url: walletConnectConfig?.url || 'https://layerswap.io/app/',
                        icons: walletConnectConfig?.icons || ['https://www.layerswap.io/app/symbol.png'],
                    },
                },
            })
        ],
        [solNetwork, WALLETCONNECT_PROJECT_ID, walletConnectConfig]
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
