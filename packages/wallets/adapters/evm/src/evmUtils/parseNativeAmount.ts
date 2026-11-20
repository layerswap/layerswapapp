import { parseUnits } from 'viem'

/**
 * Native value in base units; backend base units win over the display amount.
 * Numbers below 1e-6 stringify with an exponent, which parseUnits rejects, so
 * only those go through toFixed (exact at that magnitude, within one wei).
 */
export function parseNativeAmount(amount: number | string, decimals: number, amountInBaseUnits?: string): bigint {
    if (amountInBaseUnits != null) {
        return BigInt(amountInBaseUnits)
    }

    const text = String(amount)
    if (/e/i.test(text)) {
        return parseUnits(Number(text).toFixed(decimals), decimals)
    }

    return parseUnits(text, decimals)
}
