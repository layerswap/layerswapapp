import { FC, ReactNode } from "react";
import { Swap, LayerswapProvider, LayerSwapSettings } from '@layerswap/widget'
import "@layerswap/widget/index.css"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import {
    DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "viem/chains";
import { EVMProvider } from "@layerswap/wallet-evm"
import { ImtblPassportProvider } from "@layerswap/wallet-imtbl-passport"
import { ImmutableXProvider } from '@layerswap/wallet-imtbl-x'
import useCustomEVM from "../hooks/useCustomEVM";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'


const config = createConfig({
    chains: [mainnet, sepolia],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
    },
})

const queryClient = new QueryClient()

const PageComponent: FC<{ settings?: LayerSwapSettings }> = ({ settings }) => {

    const imtblPassportConfigs = typeof window !== 'undefined' ? {
        clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
        publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
        redirectUri: `${window.location.origin}/imtblRedirect`,
        logoutRedirectUri: `${window.location.origin}/`
    } : undefined

    const evmProvider: typeof EVMProvider = {
        ...EVMProvider,
        walletConnectionProvider: useCustomEVM
    }
    return (
        <DynamicContextProvider
            settings={{
                // Find your environment id at https://app.dynamic.xyz/dashboard/developer
                environmentId: "63a881b4-4008-45d7-9697-4a9e743f51d9",
                walletConnectors: [EthereumWalletConnectors],
            }}
        >
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <div className="w-[600px] mx-auto flex flex-col justify-center place-self-center h-screen rounded-lg">
                        <LayerswapProvider
                            config={{
                                settings,
                                theme: { enablePortal: false, header: { hideMenu: true, hideTabs: true, hideWallets: true }, cardBackgroundStyle: { background: 'transparent' } } as any,
                                apiKey: 'm1jz5JMmndWbMmYLm5vcsHtpxQ35xGT2Z4xa+rp/i98GXVc1vhH7lvY0zbLMTdkD9BXw+HLUTku4H6VumEDogQ',
                                version: 'mainnet',
                                initialValues: {
                                    to: 'IMMUTABLEZK_MAINNET',
                                    toAsset: 'USDC',
                                    lockTo: true,
                                    lockAsset: true
                                },
                                imtblPassport: imtblPassportConfigs
                            }}
                            walletProviders={[evmProvider, ImmutableXProvider, ImtblPassportProvider]}
                        >
                            <Swap />
                        </LayerswapProvider>
                    </div>
                </QueryClientProvider>
            </WagmiProvider>
        </DynamicContextProvider>
    )
}

export default PageComponent