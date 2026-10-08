import type { AddEthereumChainParams, Network, RpcHealth, RpcHealthCheckStore, SuggestRpcResult } from '@layerswap/widget-types'

const UNKNOWN_HEALTH: RpcHealth = Object.freeze({ status: undefined })

/**
 * The verdict only describes `network` when it was measured on that network's chain. A wallet
 * on another chain is switched by the send flow, after which the provider probes again; until
 * then the source network's health is unknown. Verdicts without a chain predate chain tagging
 * and are passed through. Loose comparison: wallets report numeric ids, the API serves strings.
 */
export function rpcHealthForNetwork(health: RpcHealth, network: Pick<Network, 'chain_id'>): RpcHealth {
    if (health.status === undefined || health.chainId == null) return health
    return network.chain_id != null && health.chainId == network.chain_id ? health : UNKNOWN_HEALTH
}

function toHexChainId(chainId: Network['chain_id']): string | undefined {
    const id = Number(chainId)
    return chainId != null && chainId !== '' && Number.isSafeInteger(id) && id > 0 ? `0x${id.toString(16)}` : undefined
}

/** Adds `rpcUrl` for `network`'s own chain, never for whichever chain the wallet happens to be on. */
export function suggestRpcForNetwork(
    store: Pick<RpcHealthCheckStore, 'suggestRpc'>,
    network: Pick<Network, 'chain_id'>,
    rpcUrl: string,
    chainDetails: Omit<AddEthereumChainParams, 'chainId' | 'rpcUrls'>,
): Promise<SuggestRpcResult> {
    const chainId = toHexChainId(network.chain_id)
    if (!chainId) return Promise.resolve({ success: false, error: 'Network has no EVM chain id' })
    return store.suggestRpc({ ...chainDetails, chainId, rpcUrls: [rpcUrl] })
}
