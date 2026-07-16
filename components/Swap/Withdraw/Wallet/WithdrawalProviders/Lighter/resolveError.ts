export type StepError = { header: string; details: string }

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
