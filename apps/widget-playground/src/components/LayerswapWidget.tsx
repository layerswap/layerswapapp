"use client";
import { FC, ReactNode, useMemo } from 'react';
import { LayerswapProvider, Swap, WidgetLoading } from '@layerswap/widget';
import { useWidgetContext } from '@/context/ConfigContext';
import { useSettingsState } from '@/context/settings';
import {
    createEVMShell,
    createStarknetShell,
    createFuelShell,
    createParadexShell,
    createBitcoinShell,
    createTONShell,
    createSVMShell,
    createTronShell,
    type WalletProviderShell,
} from '@layerswap/wallets';

const walletConnectConfigs = {
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://layerswap.io/app/',
    icons: ['https://www.layerswap.io/app/symbol.png']
}

const tonConfigs = {
    tonApiKey: process.env.NEXT_PUBLIC_TON_API_KEY || '',
    manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
}

const LayerswapWidget: FC = () => {
    const { widgetRenderKey, showLoading, config, customEvmSwitch, initialValues } = useWidgetContext();
    const settings = useSettingsState();

    const shellTree: ReactNode = useMemo(() => {
        const shells: WalletProviderShell[] = [
            createEVMShell({ walletConnectConfigs }),
            createStarknetShell(),
            createFuelShell(),
            createParadexShell(),
            createBitcoinShell(),
            createTONShell({ tonConfigs }),
            createSVMShell({ walletConnectConfigs }),
            createTronShell(),
        ]
        const inner = showLoading ? <WidgetLoading /> : <Swap />
        return shells.reduceRight<ReactNode>(
            (acc, Shell) => <Shell>{acc}</Shell>,
            inner,
        )
    }, [showLoading])

    return (
        <div
            key={widgetRenderKey}
            className="flex items-center justify-center min-h-screen w-full place-self-center">
            <div className='w-full h-full rounded-xl'>
                <LayerswapProvider
                    config={{
                        apiKey: process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY as string,
                        version: process.env.NEXT_PUBLIC_API_VERSION as 'mainnet' | 'testnet',
                        settings,
                        theme: config.theme,
                        initialValues
                    }}
                >
                    {shellTree}
                </LayerswapProvider>
            </div>
        </div>
    );
};
export default LayerswapWidget
