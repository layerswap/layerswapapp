import { clusterApiUrl } from "@solana/web3.js";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import {
    NightlyWalletAdapter,
    WalletConnectWalletAdapter,
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    BitgetWalletAdapter,
    TrustWalletAdapter,
    LedgerWalletAdapter
} from "@solana/wallet-adapter-wallets";
import { ReactNode, useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_API_VERSION == 'sandbox' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

const adapters = [
    new PhantomWalletAdapter(),
    new NightlyWalletAdapter(),
    new SolflareWalletAdapter(),
    new BitgetWalletAdapter(),
    new TrustWalletAdapter(),
    new LedgerWalletAdapter(),
    new WalletConnectWalletAdapter({
        network: SOLANA_NETWORK,
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
]

function SolanaProvider({ children }: { children: ReactNode }) {
    const endpoint = useMemo(() => clusterApiUrl(SOLANA_NETWORK), [SOLANA_NETWORK]);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={adapters} autoConnect={true}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default SolanaProvider;
