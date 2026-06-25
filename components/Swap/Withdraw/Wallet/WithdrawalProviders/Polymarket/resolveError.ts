export type StepError = { header: string; details: string }

/**
 * Map a raw Polymarket bridge / relayer / Safe error string to user-facing copy.
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
    if (lower.includes('slippage') || lower.includes('quote') || lower.includes('price') || lower.includes('liquidity'))
        return { header: 'Price moved', details: 'The pUSD→USDC conversion moved beyond the expected range. Please try again in a moment.' }
    return { header: 'Withdrawal failed', details: message || 'Polymarket rejected the withdrawal.' }
}
