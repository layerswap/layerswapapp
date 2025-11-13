"use client";
import { FC } from 'react';
import { LayerswapProvider, Swap, WidgetLoading } from '@layerswap/widget';
import { useWidgetContext } from '@/context/ConfigContext';
import { useSettingsState } from '@/context/settings';
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { createConfig, http, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider, } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import useCustomEvm from '@/hooks/useCustomEvm';
import { createEVMProvider } from '@layerswap/wallets'

const wagmiConfig = createConfig({
    chains: [mainnet],
    multiInjectedProviderDiscovery: false,
    transports: {
        [mainnet.id]: http(),
    },
});

const queryClient = new QueryClient();

const LayerswapWidgetCustomEvm: FC = () => {
    const { widgetRenderKey, showLoading, config } = useWidgetContext();
    const settings = useSettingsState();

    const evmProvider = createEVMProvider({
        customHook: useCustomEvm,
    })

    return (
        <DynamicContextProvider
            settings={{
                environmentId: "63a881b4-4008-45d7-9697-4a9e743f51d9",
                walletConnectors: [EthereumWalletConnectors],
            }}
        >
            <WagmiProvider config={wagmiConfig}>
                <QueryClientProvider client={queryClient}>
                    <div
                        key={widgetRenderKey}
                        className="flex items-center justify-center min-h-screen w-full place-self-center">
                        <div className='w-full h-full rounded-xl'>
                            <LayerswapProvider
                                config={{
                                    ...config,
                                    apiKey: process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string,
                                    version: process.env.NEXT_PUBLIC_API_VERSION as 'mainnet' | 'testnet',
                                    settings
                                }}
                                walletProviders={[evmProvider]}
                            >

                                {
                                    showLoading
                                        ? <WidgetLoading />
                                        : <Swap />
                                }

                            </LayerswapProvider>
                        </div>
                    </div>
                </QueryClientProvider>
            </WagmiProvider>
        </DynamicContextProvider >
    );
};

export default LayerswapWidgetCustomEvm