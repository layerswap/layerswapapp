import React, { useEffect, useState } from 'react'
import { InferGetServerSidePropsType } from 'next';
import { getServerSideProps } from '../helpers/getSettings';
import NoCookies from '../components/NoCookies';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';


const queryClient = new QueryClient();

export default function Salon({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <div className={`flex flex-col items-center min-h-screen overflow-hidden relative font-robo`}>
            <div className="w-full max-w-lg z-[1]">
                <div className="flex content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-6 max-w-lg">
                    <div className="flex flex-col w-full text-primary-text">
                        <WagmiProvider config={config}>
                            <QueryClientProvider client={queryClient}>
                                <ConnectWallet />
                            </QueryClientProvider>
                        </WagmiProvider>
                    </div>
                </div>
            </div>
        </div>
    )
}
import { http, createConfig } from 'wagmi';
import { base, mainnet, optimism } from 'wagmi/chains';
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors';
import { useAccount } from 'wagmi';
import { Connector, useChainId, useConnect } from 'wagmi';

const projectId = '6113382c2e587bff00e2b5c3d68531f3';

const config = createConfig({
    chains: [mainnet, optimism, base],
    connectors: [injected(), walletConnect({ projectId }), metaMask(), safe()],
    transports: {
        [mainnet.id]: http(),
        [optimism.id]: http(),
        [base.id]: http(),
    },
});
function ConnectWallet() {
    const { isConnected } = useAccount();
    return (
        <div className="container"><Connect /></div>
    );
}

function Connect() {
    const chainId = useChainId();
    const { connectors: _, connectAsync } = useConnect();
    const [connectors, setConnectors] = useState<readonly Connector[]>()
    useEffect(() => {
        if (_) {
            setConnectors(_)
        }
    }, [])

    return (
        <div className="buttons">
            {connectors?.map((connector) => (
                <ConnectorButton
                    key={connector.uid}
                    connector={connector}
                    onClick={() => connectAsync({ connector, chainId })}
                />
            ))}
        </div>
    );
}

function ConnectorButton({
    connector,
    onClick,
}: {
    connector: Connector;
    onClick: () => void;
}) {
    const [ready, setReady] = React.useState(false);
    React.useEffect(() => {
        (async () => {
            const provider = await connector.getProvider();
            setReady(!!provider);
        })();
    }, [connector, setReady]);

    return (
        <button
            className="button m-2 cursor-pointer p-2 border border-secondary-400"
            disabled={!ready}
            onClick={onClick}
            type="button"
        >
            {connector.name}
        </button>
    );
}
export { getServerSideProps };