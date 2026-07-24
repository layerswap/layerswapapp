import { BaseError } from "viem"
import { resolveError } from "../../evmUtils/resolveError"

export type StepError = { header: string; details: string }

/**
 * Map a raw Hyperliquid `/exchange` error string to user-facing copy.
 * Works on Hyperliquid's plain-text error responses rather than viem errors.
 */
export function resolveHyperliquidError(message: string): StepError {
    const lower = message?.toLowerCase() || ''
    if (lower.includes('insufficient'))
        return { header: 'Insufficient balance', details: 'Your Hyperliquid balance is too low to cover this withdrawal' }
    if (lower.includes('nonce') || lower.includes('time'))
        return { header: 'Please try again', details: 'The request expired or your device clock is out of sync. Try again.' }
    if (lower.includes('does not exist') || lower.includes('account') || lower.includes('user'))
        return { header: 'No Hyperliquid account', details: 'This wallet has no Hyperliquid account or balance.' }
    return { header: 'Withdrawal failed', details: message || 'Hyperliquid rejected the withdrawal.' }
}

/** Whether a signing error is the user declining the wallet prompt. */
export function isUserRejection(err: unknown): boolean {
    if (resolveError(err as BaseError) === 'transaction_rejected') return true
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}
