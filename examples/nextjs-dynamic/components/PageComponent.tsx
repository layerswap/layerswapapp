import { FC } from "react";
import { Swap, LayerswapProvider, LayerSwapSettings } from '@layerswap/widget'
import "@layerswap/widget/index.css"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import {
    DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import CustomHooks from '../components/CustomHooks';

const PageComponent: FC<{ settings: LayerSwapSettings }> = ({ settings }) => {

    // const settingsChains = settings?.networks
    //     .filter(net => net.type.toString() === 'EVM'
    //         && net.node_url
    //         && net.token)
    //     .map(resolveChain) as Chain[]

    return (
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
                    apiKey='NDBxG+aon6WlbgIA2LfwmcbLU52qUL9qTnztTuTRPNSohf/VnxXpRaJlA5uLSQVqP8YGIiy/0mz+mMeZhLY4/Q'
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