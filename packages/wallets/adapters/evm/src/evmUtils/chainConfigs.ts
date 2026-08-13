import NetworkSettings from "../NetworkSettings";
import type { AppNetworkAdapter } from "@layerswap/wallet-core"
import { Chain, fallback, http } from 'viem';
import { resolveAdapterChain } from "./resolveChain";

const chainsToFilter = [70700, 70701]

export type EvmChainsConfig = {
    chains: [Chain, ...Chain[]]
    transports: Record<number, ReturnType<typeof fallback> | ReturnType<typeof http>>
}

export function getEvmChainsConfig<Network>(networks: Network[], networkAdapter: AppNetworkAdapter<Network>): EvmChainsConfig {
    const isChain = (c: Chain | undefined): c is Chain => c != undefined

    const settingsChains = networks
        .slice()
        .sort((a, b) => (NetworkSettings.KnownSettings[networkAdapter.getId(a)]?.ChainOrder || Number(networkAdapter.getChainId(a))) - (NetworkSettings.KnownSettings[networkAdapter.getId(b)]?.ChainOrder || Number(networkAdapter.getChainId(b))))
        .filter(network => networkAdapter.isEvmNetwork(network)
            && networkAdapter.getRpcUrls(network).length > 0
            && networkAdapter.getNativeCurrency(network)
            && networkAdapter.getChainId(network) && !chainsToFilter.includes(Number(networkAdapter.getChainId(network)))
        )
        .map(network => resolveAdapterChain(network, networkAdapter))
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
