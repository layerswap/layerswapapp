"use client";
import { FC, ReactNode } from 'react';
import { LayerswapProvider, Swap, WalletHooksProvider, WidgetLoading } from '@layerswap/widget';
import { useWidgetContext } from '@/context/ConfigContext';
import { useSettingsState } from '@/context/settings';
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { createConfig, http, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import useCustomEvm from '@/hooks/useCustomEvm';

const config = createConfig({
    chains: [mainnet],
    multiInjectedProviderDiscovery: false,
    transports: {
        [mainnet.id]: http(),
    },
});

const queryClient = new QueryClient();

const LayerswapWidget: FC = () => {
    const { widgetRenderKey, themeData, featuredNetwork, showLoading } = useWidgetContext();
    const settings = useSettingsState();
    return (
        <DynamicContextProvider
            settings={{
                environmentId: "63a881b4-4008-45d7-9697-4a9e743f51d9",
                walletConnectors: [EthereumWalletConnectors],
            }}
        >
            <div
                key={widgetRenderKey}
                className="tw-flex tw-items-center tw-justify-center tw-min-h-screen tw-w-full tw-place-self-center">
                <div className="tw-w-full tw-h-full tw-max-w-lg tw-border-2 tw-border-secondary-700 tw-rounded-xl">
                    <LayerswapProvider
                        apiKey={process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string}
                        integrator="test"
                        themeData={themeData}
                        settings={settings}
                    >
                        <WagmiProvider config={config}>
                            <QueryClientProvider client={queryClient}>
                                <CutsomHooks>
                                    {showLoading ? <WidgetLoading />
                                        : <Swap
                                            featuredNetwork={
                                                featuredNetwork &&
                                                    featuredNetwork.initialDirection &&
                                                    featuredNetwork.network ?
                                                    {
                                                        initialDirection: featuredNetwork.initialDirection,
                                                        network: featuredNetwork.network,
                                                        oppositeDirectionOverrides: featuredNetwork.oppositeDirectionOverrides,
                                                    }
                                                    : undefined
                                            }
                                        />}
                                </CutsomHooks>
                            </QueryClientProvider>
                        </WagmiProvider>
                    </LayerswapProvider>
                </div>
            </div>
        </DynamicContextProvider>
    );
};
const CutsomHooks = ({ children }: { children: ReactNode }) => {
    const { customEvmSwitch } = useWidgetContext();
    const customEvmValue = useCustomEvm();
    const customEvm = customEvmSwitch ? customEvmValue : undefined;

    return (
        <WalletHooksProvider overides={{ evm: customEvm }}>{children}</WalletHooksProvider>
    );
}

export default LayerswapWidget