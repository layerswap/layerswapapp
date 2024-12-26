import type { Adapter, WalletError } from '@tronweb3/tronwallet-abstract-adapter';
import { WalletDisconnectedError, WalletNotFoundError } from '@tronweb3/tronwallet-abstract-adapter';
import { toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
export default function TronProvider({ children }: { children: React.ReactNode }) {
    function onError(e: WalletError) {
        if (e instanceof WalletNotFoundError) {
            toast.error(e.message);
        } else if (e instanceof WalletDisconnectedError) {
            toast.error(e.message);
        } else toast.error(e.message);
    }
    const [adapters, setAdapters] = useState<Adapter[]>([]);
    useEffect(() => {
        import('../../lib/wallets/tron/connectors').then((res) => {
            const {
                BitKeepAdapter,
                OkxWalletAdapter,
                TokenPocketAdapter,
                TronLinkAdapter,
                // LedgerAdapter,
            } = res;
            const tronLinkAdapter = new TronLinkAdapter();
            // const ledger = new LedgerAdapter({
            //     accountNumber: 2,
            // });
            const bitKeepAdapter = new BitKeepAdapter();
            const tokenPocketAdapter = new TokenPocketAdapter();
            const okxwalletAdapter = new OkxWalletAdapter();
            setAdapters([
                tronLinkAdapter,
                bitKeepAdapter,
                tokenPocketAdapter,
                okxwalletAdapter,
                // ledger
            ])
        });
    }, [setAdapters])

    return (
        <WalletProvider onError={onError} adapters={adapters} disableAutoConnectOnLoad={true}>
            {children}
        </WalletProvider>
    );
}