import { useSettingsState } from "../../../context/settings";
import { NetworkType } from "../../../Models/Network";
import resolveChain from "../../../lib/resolveChain";
import { useContext } from "react";
import NetworkSettings from "../../../lib/NetworkSettings";
import { WagmiContext, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { Chain, http } from 'viem';
import { useEvmConnectors } from "../../../context/evmConnectorsContext";
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";

type Props = {
    children: JSX.Element | JSX.Element[]
}

const queryClient = new QueryClient()

const chainsToFilter = [
    70700,
    70701
]

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();

    const ctx = useContext(WagmiContext)

    if (ctx) {
        return <ActiveEvmAccountProvider>
            {children}
        </ActiveEvmAccountProvider>
    }

    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = settings?.networks
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

    const { connectors } = useEvmConnectors()

    const config = createConfig({
        connectors,
        chains: settingsChains as [Chain, ...Chain[]],
        transports: transports,
    });


    return (
        <WagmiProvider config={config} >
            <QueryClientProvider client={queryClient}>
                <ActiveEvmAccountProvider>
                    {children}
                </ActiveEvmAccountProvider>
            </QueryClientProvider>
        </WagmiProvider >
    )
}

export default WagmiComponent