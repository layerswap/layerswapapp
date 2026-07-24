import { NetworkSettings } from "@layerswap/utils";
import { Network, NetworkType } from "@layerswap/utils"
import { Chain, http, fallback } from 'viem';
import resolveChain from "./resolveChain";

const chainsToFilter = [70700, 70701]

export type EvmChainsConfig = {
    chains: [Chain, ...Chain[]]
    transports: Record<number, ReturnType<typeof fallback> | ReturnType<typeof http>>
}

export function getEvmChainsConfig(networks: Network[]): EvmChainsConfig {
    const isChain = (c: Chain | undefined): c is Chain => c != undefined

    const settingsChains = networks
        .slice()
        .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
        .filter(net => net.type === NetworkType.EVM
            && net.node_url
            && net.token
            && net.chain_id && !chainsToFilter.includes(Number(net.chain_id))
        )
        .map(resolveChain)
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
