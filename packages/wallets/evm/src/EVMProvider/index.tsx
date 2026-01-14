import { Config, WagmiContext, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientContext, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { EvmConnectorsProvider, useEvmConnectors } from "./evmConnectorsContext";
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";
import { useSettingsState } from "@layerswap/widget/internal";
import { useContext, useMemo } from 'react';
import type { JSX } from 'react';
import { useChainConfigs } from '../evmUtils/chainConfigs';
import { WalletConnectConfig } from '../index';

type Props = {
    children: JSX.Element | JSX.Element[]
    walletConnectConfigs?: WalletConnectConfig
}

const queryClient = new QueryClient()

let cachedConfig: Config | null = null

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();

    const { connectors } = useEvmConnectors()
    const { chains, transports } = useChainConfigs(settings?.networks)

    // Create config ONCE - never recreate to preserve connection state
    const config = useMemo(() => {
        if (!cachedConfig) {
            cachedConfig = createConfig({
                connectors,
                chains: chains,
                transports: transports,
                ssr: true
            })
        }
        return cachedConfig
    }, []) // Empty deps - only create once

    return (
        <WagmiProvider config={config} reconnectOnMount={true}>
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