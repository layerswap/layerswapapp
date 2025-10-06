import { FC } from "react";
import { Swap, LayerswapProvider, LayerSwapSettings } from '@layerswap/widget'
import "@layerswap/widget/index.css"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import {
    DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import CustomHooks from '../components/CustomHooks';
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "viem/chains";

const PageComponent: FC<{ settings?: LayerSwapSettings }> = ({ settings }) => {

    // const settingsChains = settings?.networks
    //     .filter(net => net.type.toString() === 'EVM'
    //         && net.node_url
    //         && net.token)
    //     .map(resolveChain) as Chain[]

    const config = createConfig({
        chains: [mainnet, sepolia],
        transports: {
            [mainnet.id]: http(),
            [sepolia.id]: http(),
        },
    })
    return (
        <WagmiProvider config={config}>
            <DynamicContextProvider
                settings={{
                    // Find your environment id at https://app.dynamic.xyz/dashboard/developer
                    environmentId: "63a881b4-4008-45d7-9697-4a9e743f51d9",
                    walletConnectors: [EthereumWalletConnectors],
                    // overrides: {
                    //     evmNetworks: settingsChains
                    //         ? convertToDynamicNetworks(settingsChains)
                    //         : undefined,
                    // }
                }}
            >
                <div className="max-w-lg mx-auto flex flex-col justify-center place-self-center h-screen rounded-lg">
                    <LayerswapProvider
                        integrator='experimental'
                        settings={settings}
                        version='mainnet'
                        themeData={{ enablePortal: false, borderRadius: 'extraLarge' }}
                        apiKey='m1jz5JMmndWbMmYLm5vcsHtpxQ35xGT2Z4xa+rp/i98GXVc1vhH7lvY0zbLMTdkD9BXw+HLUTku4H6VumEDogQ'
                    >
                        <CustomHooks >
                            <Swap
                                featuredNetwork={{
                                    initialDirection: 'from',
                                    network: 'LINEA_MAINNET',
                                    oppositeDirectionOverrides: 'onlyExchanges'
                                }}
                            />
                        </CustomHooks>
                    </LayerswapProvider>
                </div>
            </DynamicContextProvider>
        </WagmiProvider>
    )
}

// const convertToDynamicNetworks = (chains: Chain[]) =>
//     chains.map((chain) => ({
//         id: chain.id,
//         blockExplorerUrls: [chain.blockExplorers?.default.url!],
//         chainId: chain.id,
//         chainName: chain.name,
//         iconUrls: [''],
//         name: chain.name,
//         nativeCurrency: chain.nativeCurrency,
//         networkId: chain.id,
//         rpcUrls: [chain.rpcUrls.default.http as unknown as string],
//         vanityName: chain.name,
//     }))

export default PageComponent