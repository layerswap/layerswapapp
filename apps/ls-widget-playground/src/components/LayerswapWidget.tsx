"use client";
import { FC } from 'react';
import { LayerswapProvider, Swap } from '@layerswap/widget';
import { useTheme, useFeaturedNetwork } from '@/context/ConfigContext';
import { useSettingsState } from '@/context/settings';

const LayerswapWidget: FC = () => {
    const { themeData } = useTheme();
    const settings = useSettingsState()
    const { featuredNetwork } = useFeaturedNetwork();
    console.log('featuredNetwork', featuredNetwork)
    return (
        <div className="flex items-center justify-center min-h-screen w-full place-self-center">
            <div className='w-full h-full max-w-lg'>
                <LayerswapProvider
                    apiKey={process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string}
                    integrator="test"
                    themeData={themeData}
                    settings={settings}
                >
                    <Swap
                        featuredNetwork={featuredNetwork}
                    />
                </LayerswapProvider>
            </div>
        </div>
    );
};

export default LayerswapWidget