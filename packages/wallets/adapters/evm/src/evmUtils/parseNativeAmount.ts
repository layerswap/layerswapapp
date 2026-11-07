import { parseUnits } from 'viem'

/** Preserve decimal strings and base units; expand scientific notation without
 * converting through Number and losing significant digits. */
export function parseNativeAmount(amount: number | string, decimals: number, amountInBaseUnits?: string): bigint {
    if (amountInBaseUnits != null) return BigInt(amountInBaseUnits)

    const text = String(amount)
    const scientific = /^(-?)(\d+)(?:\.(\d*))?e([+-]?\d+)$/i.exec(text)
    if (!scientific) return parseUnits(text, decimals)

    const [, sign, integer, fraction = '', exponentText] = scientific
    const exponent = Number(exponentText)
    // Native amounts cannot need an exponent outside the finite Number range.
    if (!Number.isInteger(exponent) || Math.abs(exponent) > 308) {
        throw new Error('Native amount exponent is out of range')
    }
    const digits = integer + fraction
    const point = integer.length + exponent
    let expanded: string
    if (point <= 0) {
        expanded = `0.${'0'.repeat(-point)}${digits}`
    } else if (point >= digits.length) {
        expanded = digits + '0'.repeat(point - digits.length)
    } else {
        expanded = `${digits.slice(0, point)}.${digits.slice(point)}`
    }
    return parseUnits(sign + expanded, decimals)
}
