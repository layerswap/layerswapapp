import { http, fallback } from '@wagmi/core'
import type { HttpTransport } from 'viem'

export type TransportOptions = {
    retryCount?: number
    timeoutMs?: number
    batch?: boolean
}

const DEFAULT_RETRY_COUNT = 3
const DEFAULT_RETRY_DELAY_MS = 1000
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
            retryDelay: DEFAULT_RETRY_DELAY_MS,
            timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
        })
    )
}

/**
 * Creates a fallback transport from an array of node URLs
 * @param nodes - Array of RPC node URLs
 * @param options - Optional transport configuration
 * @returns Fallback transport wrapping all HTTP transports
 */
export const resolveFallbackTransport = (
    nodes: string[],
    options?: TransportOptions
) => {
    // Retry the fallback round, not each endpoint within every round. Otherwise
    // three HTTP retries plus three fallback retries produce 16 attempts per node.
    // Trying each node once also lets a healthy fallback respond immediately.
    return fallback(resolveTransports(nodes, { ...options, retryCount: 0 }), {
        retryCount: options?.retryCount ?? DEFAULT_RETRY_COUNT,
        retryDelay: DEFAULT_RETRY_DELAY_MS,
    })
}

