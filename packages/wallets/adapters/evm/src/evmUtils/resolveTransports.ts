import { http, fallback } from '@wagmi/core'
import type { HttpTransport } from 'viem'

type NetworkNodes = { nodes?: string[] | null, node_url?: string | null }

export type TransportOptions = {
    retryCount?: number
    timeoutMs?: number
    batch?: boolean
}

const DEFAULT_RETRY_COUNT = 3
const DEFAULT_TIMEOUT_MS = 60000
const DEFAULT_BATCH = false

/**
 * Creates HTTP transports from an array of node URLs
 * @param nodes - Array of RPC node URLs
 * @param options - Optional transport configuration
 * @returns Array of HTTP transports
 */
export const resolveTransports = (
    nodes: string[],
    options?: TransportOptions
): HttpTransport[] => {
    return nodes.map(node =>
        http(node, {
            batch: options?.batch ?? DEFAULT_BATCH,
            retryCount: options?.retryCount ?? DEFAULT_RETRY_COUNT,
            timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
        })
    )
}

/**
 * A network's RPC URLs: its `nodes` list, or its single `node_url` when the list
 * is empty (some networks are configured with `node_url` only).
 */
export const resolveNetworkNodes = (network: NetworkNodes): string[] =>
    network.nodes?.length ? network.nodes : [network.node_url].filter((url): url is string => !!url)

/**
 * Creates a fallback transport over a network's RPC URLs
 * @param network - Network whose `nodes` (or `node_url`) to use
 * @param options - Optional transport configuration
 * @returns Fallback transport wrapping all HTTP transports
 */
export const resolveFallbackTransport = (
    network: NetworkNodes,
    options?: TransportOptions
) => {
    const nodes = resolveNetworkNodes(network)
    // viem's fallback() accepts an empty list and then fails every call with an opaque error.
    if (nodes.length === 0) throw new Error('No RPC nodes configured for this network')
    return fallback(resolveTransports(nodes, options))
}
