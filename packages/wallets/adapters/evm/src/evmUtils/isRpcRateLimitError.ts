/** RPC errors can be wrapped several times by viem before reaching fee estimation. */
export const isRpcRateLimitError = (error: unknown): boolean => {
    const visited = new Set<object>()
    let current = error

    while (current && typeof current === 'object' && !visited.has(current)) {
        visited.add(current)
        const { status, code, message, cause } = current as {
            status?: number
            code?: number
            message?: string
            cause?: unknown
        }

        if (status === 429 || code === 429 || code === -32005) {
            return true
        }
        if (typeof message === 'string' && /rate[\s_-]*limit|too many requests/i.test(message)) {
            return true
        }

        current = cause
    }

    return false
}
