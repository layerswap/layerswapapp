import { Config, WagmiContext, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientContext, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";
import { isMobile, useSettingsState } from "@layerswap/widget/internal";
import { useContext, useMemo } from 'react';
import type { JSX, ReactNode } from 'react';
import { useChainConfigs } from '../evmUtils/chainConfigs';
import { useWalletConnectConfig } from '../index';
import { HIDDEN_WALLETCONNECT_ID } from "../constants";
import { useEVMConnectors } from './Connectors';

type Props = {
    children: ReactNode
}

const queryClient = new QueryClient()

let cachedConfig: Config | null = null

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();
    const walletConnectConfigs = useWalletConnectConfig();

    const { chains, transports } = useChainConfigs(settings?.networks)
    const _walletConnectConfigs = walletConnectConfigs || {
        projectId: '6113382c2e587bff00e2b5c3d68531f3',
        name: 'Layerswap',
        description: 'Layerswap App',
        url: 'https://www.layerswap.app',
        icons: ['https://www.layerswap.app/favicon.ico'],
    }
    const defaultConnectors = useEVMConnectors(HIDDEN_WALLETCONNECT_ID, _walletConnectConfigs)

    // Create config ONCE - never recreate to preserve connection state
    const config = useMemo(() => {
        if (!cachedConfig) {
            cachedConfig = createConfig({
                connectors: [...defaultConnectors],
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

const EVMProvider = ({ children }: Props) => {
    return (
        <WagmiWrapper>
            {children}
        </WagmiWrapper>
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