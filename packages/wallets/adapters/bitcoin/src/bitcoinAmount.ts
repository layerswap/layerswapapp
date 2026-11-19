export function bitcoinAmountInSatoshis(amount: number | undefined, amountInBaseUnits?: string): number {
    // A zero base-unit field can accompany a positive decimal deposit amount.
    if (amountInBaseUnits != null && amountInBaseUnits !== '0') {
        const satoshis = /^\d+$/.test(amountInBaseUnits) ? Number(amountInBaseUnits) : NaN
        if (!Number.isSafeInteger(satoshis) || satoshis <= 0) {
            throw new Error('Bitcoin amount must be a positive integer in satoshis')
        }
        return satoshis
    }

    if (amount == null || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Bitcoin amount must be a positive finite number')
    }

    // Shift the decimal digits so floating-point multiplication cannot drop a satoshi.
    const [mantissa, exponent = '0'] = amount.toString().split('e')
    const [whole, fraction = ''] = mantissa.split('.')
    const digits = whole + fraction
    const satoshiDigits = Math.max(0, whole.length + Number(exponent) + 8)
    const satoshis = Number(digits.slice(0, satoshiDigits).padEnd(satoshiDigits, '0'))
    if (!Number.isSafeInteger(satoshis) || satoshis <= 0) {
        throw new Error('Bitcoin amount must be a positive integer in satoshis')
    }
    return satoshis
}
