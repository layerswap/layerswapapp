"use client";
import { FC, ReactNode } from 'react';
import { LayerswapProvider, Swap, WalletHooksProvider, WidgetLoading } from '@layerswap/widget';
import { useWidgetContext } from '@/context/ConfigContext';
import { useSettingsState } from '@/context/settings';
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { createConfig, http, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider, } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import useCustomEvm from '@/hooks/useCustomEvm';

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

    return (
        <DynamicContextProvider
            settings={{
                environmentId: "63a881b4-4008-45d7-9697-4a9e743f51d9",
                walletConnectors: [EthereumWalletConnectors],
            }}
        >
            <div
                key={widgetRenderKey}
                className="flex items-center justify-center min-h-screen w-full place-self-center">
                <div className='w-full h-full max-w-lg border-2 border-secondary-700 rounded-xl'>
                    <LayerswapProvider
                        apiKey={process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string}
                        integrator="test"
                        settings={settings}
                        config={config}
                    >
                        <WagmiProvider config={wagmiConfig}>
                            <QueryClientProvider client={queryClient}>
                                <CutsomHooks>
                                    {
                                        showLoading
                                            ? <WidgetLoading />
                                            : <Swap />
                                    }
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

export default LayerswapWidgetCustomEvm