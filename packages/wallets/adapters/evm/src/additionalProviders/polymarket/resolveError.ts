import { BaseError } from "viem"
import { resolveError } from "../../evmUtils/resolveError"

export type StepError = { header: string; details: string }

/**
 * Map a raw Polymarket relayer / depository / unwrap error string to user-facing copy.
 * Mirrors the sibling Hyperliquid/EVM resolveError pattern.
 */
export function resolvePolymarketError(message: string): StepError {
    const lower = message?.toLowerCase() || ''
    if (lower.includes('insufficient') || lower.includes('balance is too low'))
        return { header: 'Insufficient balance', details: 'Your Polymarket balance is too low to cover this withdrawal.' }
    if (lower.includes('not deployed') || lower.includes('no polymarket') || lower.includes('does not exist'))
        return { header: 'No Polymarket account', details: 'This wallet has no Polymarket account. Connect the wallet that owns your Polymarket balance.' }
    if (lower.includes('nonce') || lower.includes('expired'))
        return { header: 'Please try again', details: 'The request expired. Please try again.' }
    if (lower.includes('not allowed') || lower.includes('not whitelisted') || lower.includes('reverted') || lower.includes('unwrap') || lower.includes('depository'))
        return { header: 'Withdrawal could not be completed', details: 'The conversion or deposit step could not be completed. Please try again in a moment.' }
    return { header: 'Withdrawal failed', details: message || 'Polymarket rejected the withdrawal.' }
}

/** Whether a signing error is the user declining the wallet prompt. */
export function isUserRejection(err: unknown): boolean {
    if (resolveError(err as BaseError) === 'transaction_rejected') return true
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}
