"use client";
import { LayerswapProvider, Swap } from '@layerswap/widget';
import { useTheme } from '@/context/ThemeContext';

export const WidgetPage = () => {
    const { themeData } = useTheme();

    return (
        <div className="flex items-center justify-center min-h-screen w-full place-self-center">
            <div className='w-full h-full max-w-lg'>
                <LayerswapProvider
                    apiKey={process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string}
                    integrator="test"
                    themeData={themeData}
                >
                    <Swap />
                </LayerswapProvider>
            </div>
        </div>
    );
};