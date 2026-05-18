"use client";
import { FC } from 'react';
import { LayerswapProvider, Swap, WidgetLoading, defineWalletProvider } from '@layerswap/widget';
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

// Custom EVM demo. Uses the legacy createEVMProvider factory + manually
// composes a shell via defineWalletProvider. The legacy factory statically
// imports wagmi/viem so importing this file pulls those into the playground
// bundle — acceptable for a demo. Production apps use createEVMShell, which
// routes the heavy code through a lazy chunk.
const evmProviderDefinition = createEVMProvider({ customHook: useCustomEvm })
const CustomEVMShell = defineWalletProvider({
    id: evmProviderDefinition.id,
    order: 100,
    wrapper: evmProviderDefinition.wrapper as React.ComponentType<{ children: React.ReactNode }>,
    walletConnectionProvider: evmProviderDefinition.walletConnectionProvider,
    transferProvider: evmProviderDefinition.transferProvider,
    balanceProvider: evmProviderDefinition.balanceProvider,
    gasProvider: evmProviderDefinition.gasProvider,
    addressUtilsProvider: evmProviderDefinition.addressUtilsProvider,
    contractAddressProvider: evmProviderDefinition.contractAddressProvider,
    rpcHealthCheckProvider: evmProviderDefinition.rpcHealthCheckProvider,
})

const LayerswapWidgetCustomEvm: FC = () => {
    const { widgetRenderKey, showLoading, config } = useWidgetContext();
    const settings = useSettingsState();

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
                            >
                                <CustomEVMShell>
                                    {
                                        showLoading
                                            ? <WidgetLoading />
                                            : <Swap />
                                    }
                                </CustomEVMShell>
                            </LayerswapProvider>
                        </div>
                    </div>
                </QueryClientProvider>
            </WagmiProvider>
        </DynamicContextProvider >
    );
};

export default LayerswapWidgetCustomEvm
