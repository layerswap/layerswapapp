import { FC } from "react";
import { AppKitConnectButton } from '@reown/appkit/react'
import { Swap, LayerswapProvider, LayerSwapSettings, ThemeData } from '@layerswap/widget'
import { EVMProvider } from "@layerswap/wallet-evm"
import "@layerswap/widget/index.css"
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { AppKitNetwork, arbitrum, base, mainnet } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

const queryClient = new QueryClient()

const projectId = '821ab14954640abd9a7974a70f74bc6c'

const metadata = {
    name: 'Layerswap Example',
    description: 'Layerswap Example',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    icons: ['https://layerswap.io/app/symbol.png']
}
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum, base]

const wagmiAdapter = new WagmiAdapter({
    networks,
    projectId,
    ssr: true
})

createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    enableWallets: true,
})

const PageComponent: FC<{ settings?: LayerSwapSettings }> = ({ settings }) => {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <div className="h-screen flex flex-col items-center justify-center gap-4">
                    <AppKitConnectButton />
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
                            walletProviders={[EVMProvider]}
                        >
                            <Swap />
                        </LayerswapProvider>
                    </div>
                </div>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

const theme: ThemeData = {
    buttonTextColor: '25, 22, 25',
    tertiary: '72, 74, 83',
    primary: {
        DEFAULT: '61, 134, 233',
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

export default PageComponent