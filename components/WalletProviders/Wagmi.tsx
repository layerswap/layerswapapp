import { useSettingsState } from "../../context/settings";
import { NetworkType } from "../../Models/Network";
import resolveChain from "../../lib/resolveChain";
import React, { useMemo, useRef } from "react";
import NetworkSettings from "../../lib/NetworkSettings";
import { WagmiProvider, createConfig, createStorage, Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Chain, http } from 'viem';
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

// Create storage outside component to ensure stability
const storage = typeof window !== 'undefined' 
    ? createStorage({ storage: window.localStorage, key: 'wagmi' })
    : undefined

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
        const t: Record<number, ReturnType<typeof http>> = {}
        settingsChains.forEach(chain => {
            t[chain.id] = chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
        })
        return t
    }, [settingsChains])

    // Use ref to keep config stable across renders - create once and reuse
    const configRef = useRef<Config | null>(null)
    
    // Only create config once - it will persist across renders
    if (!configRef.current) {
        configRef.current = createConfig({
            connectors,
            chains: settingsChains as [Chain, ...Chain[]],
            transports: transports,
            ssr: true,
            storage,
        })
    }

    return (
        <WagmiProvider config={configRef.current} reconnectOnMount={true}>
            <QueryClientProvider client={queryClient}>
                <ActiveEvmAccountProvider>
                    {children}
                </ActiveEvmAccountProvider>
            </QueryClientProvider>
        </WagmiProvider >
    )
}

export default WagmiComponent