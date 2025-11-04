import { NetworkSettings } from "@layerswap/widget/internal";
import { Network, NetworkType } from "@layerswap/widget/types";
import { Chain, http } from 'viem';
import resolveChain from "./resolveChain";

const chainsToFilter = [
    70700,
    70701
]
export function useChainConfigs(networks: Network[]) {
    
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = networks
        .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
        .filter(net => net.type === NetworkType.EVM
            && net.node_url
            && net.token
            && net.chain_id && !chainsToFilter.includes(Number(net.chain_id))
        )
        .map(resolveChain).filter(isChain) as Chain[]

    const transports = {}

    settingsChains.forEach(chain => {
        transports[chain.id] = chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
    })

    return {
        chains: settingsChains as [Chain, ...Chain[]],
        transports,
    }
}