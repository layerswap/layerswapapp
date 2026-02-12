import { useSettingsState } from "../../context/settings";
import { NetworkType } from "../../Models/Network";
import resolveChain from "../../lib/resolveChain";
import React, { useMemo } from "react";
import NetworkSettings from "../../lib/NetworkSettings";
import { WagmiProvider, createConfig, Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Chain, http, fallback } from 'viem';
import { useEvmConnectors } from "../../context/evmConnectorsContext";
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";

type Props = {
    children: JSX.Element | JSX.Element[]
}

const queryClient = new QueryClient()

const chainsToFilter = [
    70700,
    70701
]

// Module level cache - config is created ONCE and never recreated to preserve connection state
let cachedConfig: Config | null = null

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();
    const { connectors } = useEvmConnectors()
    
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    
    const settingsChains = useMemo(() => {
        return settings?.networks
            .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
            .filter(net => net.type === NetworkType.EVM
                && net.node_url
                && net.token
                && net.chain_id && !chainsToFilter.includes(Number(net.chain_id))
            )
            .map(resolveChain).filter(isChain) as Chain[]
    }, [settings?.networks])

    const transports = useMemo(() => {
        const t: Record<number, ReturnType<typeof fallback> | ReturnType<typeof http>> = {}
        settingsChains.forEach(chain => {
            const urls = chain.rpcUrls.default.http
            t[chain.id] = urls.length > 0 ? fallback(urls.map(url => http(url))) : http()
        })
        return t
    }, [settingsChains])

    // Create config ONCE - never recreate to preserve connection state
    const config = useMemo(() => {
        if (!cachedConfig) {
            cachedConfig = createConfig({
                connectors,
                chains: settingsChains as [Chain, ...Chain[]],
                transports: transports,
                ssr: true
            })
        }
        return cachedConfig
    }, []) // Empty deps - only create once

    return (
        <WagmiProvider config={config} reconnectOnMount={true}>
            <QueryClientProvider client={queryClient}>
                <ActiveEvmAccountProvider>
                    {children}
                </ActiveEvmAccountProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

export default WagmiComponent