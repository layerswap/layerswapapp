import { http, fallback } from '@wagmi/core'
import type { HttpTransport } from 'viem'

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
 * Creates a fallback transport from an array of node URLs.
 *
 * The fallback owns the retries: each attempt walks the whole node list, so a
 * hung node fails over to the next one instead of being retried in place, and
 * `retryCount` bounds the passes over the list. The inner transports get no
 * retries of their own; viem's fallback asks for that, but an `http` transport
 * created with its own `retryCount` would override it.
 * @param nodes - Array of RPC node URLs
 * @param options - Optional transport configuration
 * @returns Fallback transport wrapping all HTTP transports
 */
export const resolveFallbackTransport = (
    nodes: string[],
    options?: TransportOptions
) => {
    return fallback(resolveTransports(nodes, { ...options, retryCount: 0 }), {
        retryCount: options?.retryCount ?? DEFAULT_RETRY_COUNT,
    })
}

