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
let _configKey: string | null = null

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
    const nextConfigKey = getNetworkConfigKey(network)
    if (_config && _configKey === nextConfigKey) return _config

    const chain = network?.name.toLowerCase().includes('testnet')
        ? bitcoinTestnet(network)
        : bitcoin

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
    _configKey = nextConfigKey

    if (typeof window !== 'undefined') {
        reconnect(_config).catch(() => { /* swallow */ })
    }

    return _config
}

export function resetBitcoinConfig(): void {
    _config = null
    _configKey = null
}

function getNetworkConfigKey(network: NetworkWithTokens | undefined): string {
    return [
        network?.name ?? 'bitcoin-mainnet',
        network?.node_url ?? '',
    ].join('|')
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
