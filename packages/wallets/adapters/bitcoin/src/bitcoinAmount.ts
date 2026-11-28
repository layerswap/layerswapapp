export function bitcoinAmountInSatoshis(amount: number | undefined, amountInBaseUnits?: string): number {
    const satoshis = amountInBaseUnits && amountInBaseUnits !== '0'
        ? /^\d+$/.test(amountInBaseUnits) ? Number(amountInBaseUnits) : NaN
        : truncateToSatoshis(amount ?? 0)
    if (!Number.isSafeInteger(satoshis) || satoshis <= 0) {
        throw new Error('Bitcoin amount must be a positive integer in satoshis')
    }
    return satoshis
}

function truncateToSatoshis(amount: number): number {
    const [mantissa, exponent = '0'] = amount.toString().split('e')
    const [whole, fraction = ''] = mantissa.split('.')
    const length = Math.max(0, whole.length + Number(exponent) + 8)
    return Number((whole + fraction).slice(0, length).padEnd(length, '0'))
}
