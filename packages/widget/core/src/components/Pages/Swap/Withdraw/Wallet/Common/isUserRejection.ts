import { ActionMessageType } from '@layerswap/widget-types'

const REJECTION_MESSAGE = /\buser (?:rejected|denied|declined|cancelled|canceled)\b|\brejected the request\b|\b(?:request|transaction|signature|signing)(?: was)? (?:rejected|denied|cancelled|canceled) by (?:the )?user\b/i

// True when an error is the user rejecting a wallet request (signature or transaction).
export const isUserRejection = (err: unknown): boolean => {
    const pending: unknown[] = [err]
    const seen = new Set<object>()

    while (pending.length) {
        const value = pending.pop()
        if (typeof value === 'string') {
            if (REJECTION_MESSAGE.test(value)) return true
            continue
        }
        if (!value || typeof value !== 'object' || seen.has(value)) continue
        seen.add(value)

        const error = value as Record<string, unknown>
        if (error.name === ActionMessageType.TransactionRejected
            || error.name === 'UserRejectedRequestError'
            || error.code === 4001
            || error.code === '4001'
            || error.code === 'ACTION_REJECTED') return true

        if ([error.message, error.shortMessage, error.details].some(message =>
            typeof message === 'string' && REJECTION_MESSAGE.test(message)
        )) return true

        // Wallet providers can serialize errors or wrap a rejection in an RPC error.
        // Inspect every nested error even when the outer wrapper has its own code.
        pending.push(error.cause, error.error, error.data, error.originalError, error.info)
    }

    return false
}
