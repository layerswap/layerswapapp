import {
    bitget,
    createConfig,
    ctrl,
    leather,
    metamask,
    okx,
    onekey,
    reconnect,
    xverse,
    unisat,
    type Config,
    type CreateConnectorFn,
} from '@bigmi/client'
import { bitcoin, createClient, defineChain, http, ChainId } from '@bigmi/core'
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
        void restoreSession(_config)
    }

    return _config
}

/**
 * Eager session restore, plus cleanup of the markers it runs off.
 *
 * bigmi's connectors authorize purely off their own `<id>.connected`
 * localStorage flag instead of asking the wallet, and its MetaMask connector
 * then issues a real `bitcoin:connect` request. So a flag left behind by a
 * session the wallet no longer honors makes every page load prompt the
 * wallet — and bigmi clears neither that flag nor `recentConnectorId` when the
 * attempt fails, so rejecting the prompt changed nothing and it returned on the
 * next load, indefinitely. Clearing the markers whenever a restore yields no
 * connection caps that at a single prompt.
 *
 * The cost is that a restore which fails for a transient reason (wallet locked,
 * extension slow past bigmi's 5s poll) also drops the markers, so that wallet
 * won't auto-restore next load and has to be reconnected by hand. That is the
 * better failure: the markers claimed a connection the wallet was not honoring.
 */
async function restoreSession(config: Config): Promise<void> {
    let restored: readonly unknown[] = []
    try {
        restored = await reconnect(config)
    } catch { /* fall through to cleanup */ }
    if (restored.length) return

    try {
        await Promise.all([
            config.storage?.removeItem('recentConnectorId'),
            ...config.connectors.map(c => config.storage?.removeItem(`${c.id}.connected`)),
        ])
    } catch { /* storage unavailable — nothing to clean up */ }
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
