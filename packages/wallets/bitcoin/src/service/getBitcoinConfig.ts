import { unisat } from '@/connectors/unisat'
import { bitget, createConfig, ctrl, leather, metamask, okx, onekey, reconnect, xverse, type Config, type CreateConnectorFn, } from '@bigmi/client'
import { bitcoin, createClient, defineChain, http, ChainId } from '@bigmi/core'
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

type BitcoinNetworkConfig = {
    id: string
    rpcUrl?: string
}

export function ensureBitcoinConfig(network: BitcoinNetworkConfig | undefined): Config {
    const nextConfigKey = getNetworkConfigKey(network)
    if (_config && _configKey === nextConfigKey) return _config

    const chain = network?.id.toLowerCase().includes('testnet')
        ? bitcoinTestnet(network)
        : bitcoin

    const btcChainId = chain.id
    // Note: Phantom was removed because @bigmi/client dropped its Phantom connector in v0.9.
    const connectors: CreateConnectorFn[] = [
        xverse({ chainId: btcChainId }),
        unisat({ chainId: btcChainId }),
        ctrl({ chainId: btcChainId }),
        okx({ chainId: btcChainId }),
        bitget({ chainId: btcChainId }),
        leather({ chainId: btcChainId }),
        onekey({ chainId: btcChainId }),
        metamask({ chainId: btcChainId }),
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

function getNetworkConfigKey(network: BitcoinNetworkConfig | undefined): string {
    return [
        network?.id ?? 'bitcoin-mainnet',
        network?.rpcUrl ?? '',
    ].join('|')
}

const bitcoinTestnet = (network: BitcoinNetworkConfig) => defineChain({
    id: ChainId.BITCOIN_TESTNET,
    name: 'Bitcoin Testnet',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    rpcUrls: {
        default: {
            http: network.rpcUrl ? [network.rpcUrl] : [],
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
