import { parseUnits } from 'viem'

/**
 * Native value in base units. Backend base units win over the display amount.
 * Numbers below 1e-6 stringify with an exponent, which parseUnits rejects; at
 * that magnitude toFixed is exact because it prints far fewer than the 17
 * significant digits a double carries. Ordinary amounts never pass through
 * toFixed, so 0.1 stays 0.1 rather than its binary expansion. Digits below one
 * wei round by the binary value here and half-up in parseUnits: at most one wei
 * apart, and upstream truncation to token decimals never produces them.
 */
export function parseNativeAmount(amount: number | string, decimals: number, amountInBaseUnits?: string): bigint {
    if (amountInBaseUnits != null) return BigInt(amountInBaseUnits)

    const text = String(amount)
    return parseUnits(/e/i.test(text) ? Number(text).toFixed(decimals) : text, decimals)
}
