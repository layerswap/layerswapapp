import { NetworkSettings } from "@layerswap/widget/internal";
import { Network, NetworkType } from "@layerswap/widget/types";
import { Chain, http, fallback } from 'viem';
import resolveChain from "./resolveChain";
import { useMemo } from "react";

const chainsToFilter = [
    70700,
    70701
]
export function useChainConfigs(networks: Network[]) {
    
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = useMemo(() => {
        return networks
            .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
            .filter(net => net.type === NetworkType.EVM
                && net.node_url
                && net.token
                && net.chain_id && !chainsToFilter.includes(Number(net.chain_id))
            )
            .map(resolveChain).filter(isChain) as Chain[]
    }, [networks])

    const transports = useMemo(() => {
        const t: Record<number, ReturnType<typeof fallback> | ReturnType<typeof http>> = {}
        settingsChains.forEach(chain => {
            const urls = chain.rpcUrls.default.http
            t[chain.id] = urls.length > 0 ? fallback(urls.map(url => http(url))) : http()
        })
        return t
    }, [settingsChains])

    return {
        chains: settingsChains as [Chain, ...Chain[]],
        transports,
    }
}