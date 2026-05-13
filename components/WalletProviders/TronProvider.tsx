import { useEffect, useState } from 'react';
import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { TronLinkLocalAdapter } from '@/lib/wallets/tron/TronLinkLocalAdapter';

export default function TronProvider({ children }: { children: React.ReactNode }) {
    const [adapters, setAdapters] = useState<any[]>([]);

    useEffect(() => {
        let cancelled = false;

        const loadAdapters = async () => {
            if (typeof window === 'undefined') return;

            const [
                metamaskModule,
                okxModule,
                bitkeepModule,
                bybitModule,
                gateModule
            ] = await Promise.all([
                import('@tronweb3/tronwallet-adapter-metamask-tron'),
                import('@tronweb3/tronwallet-adapter-okxwallet'),
                import('@tronweb3/tronwallet-adapter-bitkeep'),
                import('@tronweb3/tronwallet-adapter-bybit'),
                import('@tronweb3/tronwallet-adapter-gatewallet'),
            ]);

            if (cancelled) return;

            const { MetaMaskAdapter } = metamaskModule;
            const { OkxWalletAdapter } = okxModule;
            const { BitKeepAdapter } = bitkeepModule;
            const { BybitWalletAdapter } = bybitModule;
            const { GateWalletAdapter } = gateModule;

            setAdapters([
                new MetaMaskAdapter(),
                new TronLinkLocalAdapter(),
                new OkxWalletAdapter(),
                new BitKeepAdapter(),
                new BybitWalletAdapter(),
                new GateWalletAdapter(),
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
        <WalletProvider adapters={adapters} disableAutoConnectOnLoad={true} autoConnect={false}>
            {children}
        </WalletProvider>
    );
}
