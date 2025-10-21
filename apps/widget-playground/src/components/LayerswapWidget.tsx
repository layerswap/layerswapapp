"use client";
import { FC } from 'react';
import { LayerswapProvider, Swap, WidgetLoading } from '@layerswap/widget';
import { useWidgetContext } from '@/context/ConfigContext';
import { useSettingsState } from '@/context/settings';
import dynamic from 'next/dynamic';

const LayerswapWidgetCustomEvm = dynamic(
    () => import('./LayerswapWidgetCustomEvm'),
    {
        ssr: false,
        loading: () => <WidgetLoading />,
    }
);

const LayerswapWidget: FC = () => {
    const { widgetRenderKey, showLoading, config, customEvmSwitch } = useWidgetContext();
    const settings = useSettingsState();

    if (customEvmSwitch) {
        return <LayerswapWidgetCustomEvm />;
    }

    return (
        <div
            key={widgetRenderKey}
            className="flex items-center justify-center min-h-screen w-full place-self-center">
            <div className='w-full h-full rounded-xl'>
                <LayerswapProvider
                    apiKey={process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string}
                    version={process.env.NEXT_PUBLIC_API_VERSION as 'mainnet' | 'testnet'}
                    integrator="test"
                    settings={settings}
                    config={config}
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