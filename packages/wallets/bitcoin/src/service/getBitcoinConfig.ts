import {
    createConfig,
    leather,
    onekey,
    phantom,
    reconnect,
    unisat,
    xverse,
    type Config,
    type CreateConnectorFn,
} from '@bigmi/client'
import { bitcoin, createClient, defineChain, http, ChainId, type Chain } from '@bigmi/core'
import type { NetworkWithTokens } from '@layerswap/widget/types'

let _config: Config | null = null

export function getBitcoinConfig(): Config {
    if (!_config) {
        throw new Error('Bitcoin config requested before BitcoinProvider mounted')
    }
    return _config
}

export function hasBitcoinConfig(): boolean {
    return _config !== null
}

export function ensureBitcoinConfig(network: NetworkWithTokens | undefined): Config {
    if (_config) return _config

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
        leather({ chainId: btcChainId }),
        onekey({ chainId: btcChainId }),
    ]

    _config = createConfig({
        chains: [chain],
        connectors,
        client({ chain }) {
            return createClient({ chain, transport: http() })
        },
    })

    if (typeof window !== 'undefined') {
        reconnect(_config).catch(() => { /* swallow */ })
    }

    return _config
}

const bitcoinTestnet = (network: NetworkWithTokens) => defineChain({
    id: ChainId.BITCOIN_TESTNET,
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
})
