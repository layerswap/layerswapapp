import { WagmiContext, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { EvmConnectorsProvider, useEvmConnectors } from "./evmConnectorsContext";
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";
import { useSettingsState } from "@layerswap/widget/internal";
import { useContext } from 'react';
import { useChainConfigs } from '../evmUtils/chainConfigs';

type Props = {
    children: JSX.Element | JSX.Element[]
}

const queryClient = new QueryClient()

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();

    const { connectors } = useEvmConnectors()
    const { chains, transports } = useChainConfigs(settings?.networks)

    const config = createConfig({
        connectors,
        chains,
        transports,
    });

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <ActiveEvmAccountProvider>
                    {children}
                </ActiveEvmAccountProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

const EVMProvider = ({ children }: Props) => {
    return (
        <EvmConnectorsProvider>
            <WagmiWrapper>
                {children}
            </WagmiWrapper>
        </EvmConnectorsProvider>
    )
}

const WagmiWrapper = ({ children }: Props) => {
    const wagmiContext = useContext(WagmiContext)

    if (wagmiContext) return (
        <ActiveEvmAccountProvider>
            {children}
        </ActiveEvmAccountProvider>
    )

    return <WagmiComponent>
        {children}
    </WagmiComponent>
}

export default EVMProvider