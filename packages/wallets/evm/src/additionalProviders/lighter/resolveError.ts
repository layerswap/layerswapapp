import { BaseError } from "viem"
import { resolveError } from "../../evmUtils/resolveError"

export type StepError = { header: string; details: string }

/**
 * Map a raw Lighter relay/node error string to user-facing copy. Works on Lighter's
 * plain-text error responses rather than viem errors.
 */
export function resolveLighterError(message: string): StepError {
    const lower = message?.toLowerCase() || ''
    if (lower.includes('insufficient') || lower.includes('balance'))
        return { header: 'Insufficient balance', details: 'Your Lighter balance is too low to cover this withdrawal.' }
    if (lower.includes('nonce') || lower.includes('expired') || lower.includes('time'))
        return { header: 'Please try again', details: 'The request expired or your device clock is out of sync. Try again.' }
    if (lower.includes('pub key') || lower.includes('pubkey') || lower.includes('not registered') || lower.includes('api key'))
        return { header: 'Lighter setup needed', details: 'This wallet has no registered Lighter signing key yet. Complete setup and try again.' }
    if (lower.includes('account') || lower.includes('does not exist') || lower.includes('user'))
        return { header: 'No Lighter account', details: 'This wallet has no Lighter account or balance.' }
    return { header: 'Withdrawal failed', details: message || 'Lighter rejected the withdrawal.' }
}

/** Whether a signing error is the user declining the wallet prompt. */
export function isUserRejection(err: unknown): boolean {
    if (resolveError(err as BaseError) === 'transaction_rejected') return true
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}
