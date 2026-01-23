import { FC } from "react";
import { Swap, LayerswapProvider, LayerSwapSettings, ThemeData } from '@layerswap/widget'
import { createEVMProvider } from "@layerswap/wallet-evm"
import "@layerswap/widget/index.css"
import '@rainbow-me/rainbowkit/styles.css';
import { ConnectButton, darkTheme, getDefaultConfig, RainbowKitProvider, } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, optimism, arbitrum, base, } from 'wagmi/chains';
import { QueryClientProvider, QueryClient, } from "@tanstack/react-query";

const queryClient = new QueryClient()

const config = getDefaultConfig({
    appName: 'Layerswap Example',
    projectId: '821ab14954640abd9a7974a70f74bc6c',
    chains: [mainnet, optimism, arbitrum, base],
    ssr: true,
});

const PageComponent: FC<{ settings?: LayerSwapSettings }> = ({ settings }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme()}>
                    <Comp settings={settings} />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}


const Comp: FC<{ settings?: LayerSwapSettings }> = ({ settings }) => {
    const walletProviders = [createEVMProvider({ walletConnectConfigs: walletConnect })]

    return (<div className="h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-white text-center">Layerswap Widget with RainbowKit Example</h1>
        <p className="text-gray-400 max-w-lg px-4 text-center">This example demonstrates the Layerswap widget integration using RainbowKit. For information on all available widget configurations, please refer to{' '}
            <a href="https://docs.layerswap.io/introduction" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:no-underline underline">our documentation</a>.
        </p>

        <ConnectButton />
        <div className="w-[600px] mx-auto flex flex-col justify-center place-self-center h- rounded-lg">
            <LayerswapProvider
                config={{
                    settings,
                    theme: theme,
                    apiKey: 'm1jz5JMmndWbMmYLm5vcsHtpxQ35xGT2Z4xa+rp/i98GXVc1vhH7lvY0zbLMTdkD9BXw+HLUTku4H6VumEDogQ',
                    version: 'mainnet',
                    initialValues: {
                        toAsset: 'USDC',
                        lockTo: true,
                        lockAsset: true
                    },
                }}
                walletProviders={walletProviders}
            >
                <Swap />
            </LayerswapProvider>
        </div>
    </div>
    )
}

const theme: ThemeData = {
    buttonTextColor: '248, 250, 252',
    tertiary: '72, 74, 83',
    primary: {
        DEFAULT: '14, 118, 253',
        100: '222, 231, 252',
        200: '184, 207, 248',
        300: '143, 181, 243',
        400: '101, 157, 239',
        500: '61, 134, 233',
        600: '49, 110, 202',
        700: '38, 85, 171',
        800: '27, 61, 139',
        900: '18, 40, 107',
        text: '248, 250, 252',
    },
    secondary: {
        DEFAULT: '31, 32, 35',
        100: '99, 102, 111',
        200: '82, 85, 95',
        300: '63, 66, 74',
        400: '46, 49, 56',
        500: '31, 32, 35',
        600: '24, 26, 30',
        700: '19, 20, 24',
        800: '15, 16, 20',
        900: '10, 11, 14',
        text: '168, 170, 182',
    },
}

const walletConnect = {
    projectId: '28168903b2d30c75e5f7f2d71902581b',
    name: 'Layerswap Example',
    description: 'Layerswap Example',
    url: 'https://layerswap.io/app/',
    icons: ['https://layerswap.io/app/symbol.png']
}

export default PageComponent