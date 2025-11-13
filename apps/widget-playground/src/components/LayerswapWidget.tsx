"use client";
import { FC, useMemo } from 'react';
import { LayerswapProvider, Swap, WidgetLoading } from '@layerswap/widget';
import { useWidgetContext } from '@/context/ConfigContext';
import { useSettingsState } from '@/context/settings';
// import dynamic from 'next/dynamic';
import { createEVMProvider, createStarknetProvider, createFuelProvider, createBitcoinProvider, createTONProvider, createSVMProvider, createTronProvider } from '@layerswap/wallets';
import { ZKsyncProvider } from '@layerswap/wallet-zksync';
import { LoopringProvider } from '@layerswap/wallet-loopring';
// const LayerswapWidgetCustomEvm = dynamic(
//     () => import('./LayerswapWidgetCustomEvm'),
//     {
//         ssr: false,
//         loading: () => <WidgetLoading />,
//     }
// );

const walletConnectConfigs = {
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://layerswap.io/app/',
    icons: ['https://www.layerswap.io/app/symbol.png']
}

const LayerswapWidget: FC = () => {
    const { widgetRenderKey, showLoading, config, customEvmSwitch, initialValues } = useWidgetContext();
    const settings = useSettingsState();


    const walletProviders = useMemo(() => [
        createEVMProvider({ walletConnectConfigs, walletProviderModules: [ZKsyncProvider, LoopringProvider] }),
        createStarknetProvider({ walletConnectConfigs }),
        createFuelProvider(),
        createBitcoinProvider(),
        // createTONProvider(),
        createSVMProvider({ walletConnectConfigs }),
        createTronProvider()
    ], []);

    // if (customEvmSwitch) {
    //     return <LayerswapWidgetCustomEvm />;
    // }

    return (
        <div
            key={widgetRenderKey}
            className="flex items-center justify-center min-h-screen w-full place-self-center">
            <div className='w-full h-full rounded-xl'>
                <LayerswapProvider
                    walletProviders={walletProviders}
                    config={{
                        apiKey: process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string,
                        version: process.env.NEXT_PUBLIC_API_VERSION as 'mainnet' | 'testnet',
                        settings,
                        theme: config.theme,
                        initialValues
                    }}
                >
                    {
                        showLoading
                            ? <WidgetLoading />
                            : <Swap />
                    }
                </LayerswapProvider>
            </div>
        </div>
    );
};
export default LayerswapWidget