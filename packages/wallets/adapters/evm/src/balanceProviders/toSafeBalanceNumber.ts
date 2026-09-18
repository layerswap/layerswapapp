import { formatUnits, parseUnits } from 'viem'

/** Keep a numeric balance without overstating the fetched base-unit amount. */
export function toSafeBalanceNumber(value: bigint, decimals: number): number {
    const balance = new Float64Array([Number(formatUnits(value, decimals))])
    const bits = new BigUint64Array(balance.buffer)

    while (balance[0] > 0) {
        let amount = balance[0].toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 21 })
        // Small Max amounts use toFixed when being put into the form.
        if (balance[0] < 1e-6 && decimals <= 100) amount = balance[0].toFixed(decimals)
        if (parseUnits(amount, decimals) <= value) break

        // The preceding bit pattern is the next smaller positive number.
        bits[0] -= 1n
    }

    return balance[0]
}
