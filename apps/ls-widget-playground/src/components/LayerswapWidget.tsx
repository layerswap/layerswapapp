"use client";
import { FC } from 'react';
import { LayerswapProvider, Swap } from '@layerswap/widget';
import { useWidgetContext } from '@/context/ConfigContext';
import { useSettingsState } from '@/context/settings';

const LayerswapWidget: FC = () => {
    const { widgetRenderKey, themeData, featuredNetwork } = useWidgetContext();
    const settings = useSettingsState()

    return (
        <div
            key={widgetRenderKey}
            className="flex items-center justify-center min-h-screen w-full place-self-center">
            <div className='w-full h-full max-w-lg border-2 border-secondary-700 rounded-xl'>
                <LayerswapProvider
                    apiKey={process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string}
                    integrator="test"
                    themeData={themeData}
                    settings={settings}
                >
                    <Swap
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
                    />
                </LayerswapProvider>
            </div>
        </div>
    );
};

export default LayerswapWidget