import { clusterApiUrl } from "@solana/web3.js";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import {
    NightlyWalletAdapter,
    WalletConnectWalletAdapter,
    PhantomWalletAdapter,
    CoinbaseWalletAdapter,
    SolflareWalletAdapter,
    BitgetWalletAdapter,
    TrustWalletAdapter,
    LedgerWalletAdapter,
    HuobiWalletAdapter
} from "@solana/wallet-adapter-wallets";
import { ReactNode, useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletConnectConfig } from ".";
import { AppSettings } from "@layerswap/widget/internal";
import type { ReactElement } from "react";

type SolanaProviderProps = {
    children: ReactNode
    walletConnectConfigs?: WalletConnectConfig
}

function SolanaProvider({ children, walletConnectConfigs }: SolanaProviderProps): ReactElement {
    const walletConnectConfig = walletConnectConfigs
    const WALLETCONNECT_PROJECT_ID = walletConnectConfig?.projectId

    const solNetwork = AppSettings.ApiVersion == 'sandbox' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;;
    const endpoint = useMemo(() => clusterApiUrl(solNetwork), [solNetwork]);
    const adapters = useMemo(
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
                }
            })
        ],
        [solNetwork, WALLETCONNECT_PROJECT_ID, walletConnectConfig]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={adapters} autoConnect={true}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default SolanaProvider;
