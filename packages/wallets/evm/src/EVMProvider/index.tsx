import { WagmiContext, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientContext, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { EvmConnectorsProvider, useEvmConnectors } from "./evmConnectorsContext";
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";
import { useSettingsState } from "@layerswap/widget/internal";
import { useContext } from 'react';
import { useChainConfigs } from '../evmUtils/chainConfigs';
import { WalletConnectConfig } from '../index';

type Props = {
    children: JSX.Element | JSX.Element[]
    walletConnectConfigs?: WalletConnectConfig
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
            <QueryWrapper>
                <ActiveEvmAccountProvider>
                    {children}
                </ActiveEvmAccountProvider>
            </QueryWrapper>
        </WagmiProvider>
    )
}

const EVMProvider = ({ children, walletConnectConfigs }: Props) => {
    return (
        <EvmConnectorsProvider walletConnectConfigs={walletConnectConfigs}>
            <WagmiWrapper>
                {children}
            </WagmiWrapper>
        </EvmConnectorsProvider>
    )
}

const QueryWrapper = ({ children }: Props) => {

    const context = useContext(QueryClientContext)

    if (context) {
        return <>{children}</>
    }

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

const WagmiWrapper = ({ children }: Props) => {
    const wagmiContext = useContext(WagmiContext)

    // Check if there's a valid external Wagmi context with a config
    // wagmiContext.state exists when WagmiProvider is mounted with a valid config
    const hasExternalWagmiProvider = wagmiContext && wagmiContext.state !== undefined

    if (hasExternalWagmiProvider) {
        return (
            <ActiveEvmAccountProvider>
                {children}
            </ActiveEvmAccountProvider>
        )
    }

    return <WagmiComponent>
        {children}
    </WagmiComponent>
}

export default EVMProvider