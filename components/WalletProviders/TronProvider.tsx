import type { Adapter, WalletError } from '@tronweb3/tronwallet-abstract-adapter';
import { WalletDisconnectedError, WalletNotFoundError } from '@tronweb3/tronwallet-abstract-adapter';
import { toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { LedgerAdapter } from '@tronweb3/tronwallet-adapter-ledger';
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
        import('@tronweb3/tronwallet-adapters').then((res) => {
            const {
                BitKeepAdapter,
                OkxWalletAdapter,
                TokenPocketAdapter,
                TronLinkAdapter,
                WalletConnectAdapter
            } = res;
            const tronLinkAdapter = new TronLinkAdapter();
            const ledger = new LedgerAdapter({
                accountNumber: 2,
            });
            const walletConnectAdapter = new WalletConnectAdapter({
                network: 'Nile',
                options: {
                    relayUrl: 'wss://relay.walletconnect.com',
                    // example WC app project ID
                    projectId: '5fc507d8fc7ae913fff0b8071c7df231',
                    metadata: {
                        name: 'Test DApp',
                        description: 'JustLend WalletConnect',
                        url: 'https://your-dapp-url.org/',
                        icons: ['https://your-dapp-url.org/mainLogo.svg'],
                    },
                },
                web3ModalConfig: {
                    themeMode: 'dark',
                    themeVariables: {
                        '--wcm-z-index': '1000',
                    },
                },
            });
            const bitKeepAdapter = new BitKeepAdapter();
            const tokenPocketAdapter = new TokenPocketAdapter();
            const okxwalletAdapter = new OkxWalletAdapter();
            setAdapters([tronLinkAdapter, bitKeepAdapter, tokenPocketAdapter, okxwalletAdapter, walletConnectAdapter, ledger])
        });
    }, [setAdapters])

    return (
        <WalletProvider onError={onError} adapters={adapters} disableAutoConnectOnLoad={true}>
            {children}
        </WalletProvider>
    );
}