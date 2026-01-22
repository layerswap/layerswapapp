import { useMemo } from 'react';
import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
// import { TokenPocketAdapter } from '@tronweb3/tronwallet-adapter-tokenpocket'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { BitKeepAdapter } from '@tronweb3/tronwallet-adapter-bitkeep'
import { BybitWalletAdapter } from '@tronweb3/tronwallet-adapter-bybit'
// import { FoxWalletAdapter } from '@tronweb3/tronwallet-adapter-foxwallet'
import { GateWalletAdapter } from '@tronweb3/tronwallet-adapter-gatewallet'
// import { LedgerAdapter } from '@tronweb3/tronwallet-adapter-ledger'
// import { ImTokenAdapter } from '@tronweb3/tronwallet-adapter-imtoken'
// import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust'
import { MetaMaskAdapter } from '@tronweb3/tronwallet-adapter-metamask-tron'

export default function TronProvider({ children }: { children: React.ReactNode }) {

    const adapters = useMemo(() => {
        if (typeof window === 'undefined') return
        return [
            new MetaMaskAdapter(),
            new TronLinkAdapter(),
            // new TokenPocketAdapter(),
            new OkxWalletAdapter(),
            new BitKeepAdapter(),
            new BybitWalletAdapter(),
            // new FoxWalletAdapter(),
            new GateWalletAdapter(),
            // new LedgerAdapter(),
            // new ImTokenAdapter(),
            // new TrustAdapter()
        ]
    }, [])

    return (
        <WalletProvider adapters={adapters} disableAutoConnectOnLoad={true} autoConnect={false}>
            {children}
        </WalletProvider>
    );
}