import { NetworkType, type LayerswapNetwork } from '@layerswap/widget-types';
import NetworkSettings from "../NetworkSettings";
import { Chain, fallback, http } from 'viem';
import resolveChain from "./resolveChain";

const chainsToFilter = [70700, 70701]

export type EvmChainsConfig = {
    chains: [Chain, ...Chain[]]
    transports: Record<number, ReturnType<typeof fallback> | ReturnType<typeof http>>
}

export function getEvmChainsConfig<Network extends LayerswapNetwork = LayerswapNetwork>(networks: Network[]): EvmChainsConfig {
    const isChain = (c: Chain | undefined): c is Chain => c != undefined

    const settingsChains = networks
        .slice()
        .sort((a, b) => (NetworkSettings.KnownSettings[Number(a.chain_id)]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[Number(b.chain_id)]?.ChainOrder || Number(b.chain_id)))
        .filter(network => network.type === NetworkType.EVM
            && ((network.nodes?.length ?? 0) > 0 || !!network.node_url)
            && network.token
            && network.chain_id && !chainsToFilter.includes(Number(network.chain_id))
        )
        .map(network => resolveChain(network))
        .filter(isChain) as Chain[]

    const transports: Record<number, ReturnType<typeof fallback> | ReturnType<typeof http>> = {}
    settingsChains.forEach(chain => {
        const urls = chain.rpcUrls.default.http
        transports[chain.id] = urls.length > 0 ? fallback(urls.map(url => http(url))) : http()
    })

    return {
        chains: settingsChains as [Chain, ...Chain[]],
        transports,
    }
}
