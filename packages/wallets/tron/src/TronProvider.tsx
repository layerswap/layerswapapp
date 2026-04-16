import { useEffect, useState } from 'react';
import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';

export default function TronProvider({ children }: { children: React.ReactNode }) {
    const [adapters, setAdapters] = useState<any[]>([]);

    useEffect(() => {
        let cancelled = false;

        const loadAdapters = async () => {
            if (typeof window === 'undefined') return;

            const [
                metamaskModule,
                tronLinkModule,
                okxModule,
                bitkeepModule,
                bybitModule,
                gateModule
            ] = await Promise.all([
                import('@tronweb3/tronwallet-adapter-metamask-tron'),
                import('@tronweb3/tronwallet-adapter-tronlink'),
                import('@tronweb3/tronwallet-adapter-okxwallet'),
                import('@tronweb3/tronwallet-adapter-bitkeep'),
                import('@tronweb3/tronwallet-adapter-bybit'),
                import('@tronweb3/tronwallet-adapter-gatewallet'),
            ]);

            if (cancelled) return;

            const { MetaMaskAdapter } = metamaskModule;
            const { TronLinkAdapter } = tronLinkModule;
            const { OkxWalletAdapter } = okxModule;
            const { BitKeepAdapter } = bitkeepModule;
            const { BybitWalletAdapter } = bybitModule;
            const { GateWalletAdapter } = gateModule;

            setAdapters([
                new MetaMaskAdapter(),
                new TronLinkAdapter(),
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
