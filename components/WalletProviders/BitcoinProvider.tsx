import { BigmiProvider } from '@bigmi/react'
import { createConfig, ctrl, leather, okx, onekey, phantom, unisat, xverse } from '@bigmi/client'
import type { CreateConnectorFn } from '@bigmi/client'
import { http, bitcoin, createClient, defineChain, Chain } from '@bigmi/core'
import { NetworkType, NetworkWithTokens } from '../../Models/Network'
import { useSettingsState } from '../../context/settings'

export const BitcoinProvider = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    const { networks } = useSettingsState()
    const network = networks.find(n => n.type === NetworkType.Bitcoin)
    const config = createDefaultBigmiConfig(network)

    return (
        <BigmiProvider config={config} reconnectOnMount={true}>
            {children}
        </BigmiProvider>
    )
}

function createDefaultBigmiConfig(network?: NetworkWithTokens) {

    let chain: Chain
    if (network?.name.toLowerCase().includes('testnet')) {
        chain = bitcoinTestnet(network)
    } else {
        chain = bitcoin
    }

    const btcChainId = chain.id
    const connectors: CreateConnectorFn[] = [
        phantom({ chainId: btcChainId }),
        xverse({ chainId: btcChainId }),
        unisat({ chainId: btcChainId }),
        ctrl({ chainId: btcChainId }),
        // okx({ chainId: btcChainId }),
        leather({ chainId: btcChainId }),
        onekey({ chainId: btcChainId }),
    ]

    const config = createConfig({
        chains: [chain],
        connectors,
        client({ chain }) {
            return createClient({ chain, transport: http() })
        },
    })

    return config
}

const bitcoinTestnet = (network: NetworkWithTokens) => defineChain({
    id: 20000000000002,
    name: 'Bitcoin Testnet',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    rpcUrls: {
        default: {
            http: [network.node_url],
        },
    },
    testnet: true,
    blockExplorers: {
        default: {
            name: 'Mempool',
            url: 'https://mempool.space/testnet',
        },
    },
});