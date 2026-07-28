export type DecimalInput = string | number

const toDecimalString = (value: DecimalInput, decimals: number): string => {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new Error('Invalid decimal amount')
        return value.toFixed(decimals)
    }

    const raw = value.trim()
    if (!raw) throw new Error('Invalid decimal amount')
    if (/[eE]/.test(raw)) {
        const numberValue = Number(raw)
        if (!Number.isFinite(numberValue)) throw new Error('Invalid decimal amount')
        return numberValue.toFixed(decimals)
    }

    return raw
}

const parseDecimalUnits = (value: DecimalInput, decimals: number): bigint => {
    const raw = toDecimalString(value, decimals)
    const match = raw.match(/^([+-])?(\d*)(?:\.(\d*))?$/)
    if (!match || (!match[2] && !match[3])) throw new Error('Invalid decimal amount')

    const sign = match[1] === '-' ? -1n : 1n
    const whole = match[2] || '0'
    const fractional = (match[3] || '').padEnd(decimals, '0').slice(0, decimals)
    const scale = 10n ** BigInt(decimals)

    return sign * (BigInt(whole) * scale + BigInt(fractional || '0'))
}

const formatDecimalUnits = (units: bigint, decimals: number): string => {
    const negative = units < 0n
    const abs = negative ? -units : units
    const scale = 10n ** BigInt(decimals)
    const whole = abs / scale
    const fractional = abs % scale
    const fractionalText = fractional.toString().padStart(decimals, '0').replace(/0+$/, '')

    return `${negative ? '-' : ''}${whole.toString()}${fractionalText ? `.${fractionalText}` : ''}`
}

export const addDecimal = (left: DecimalInput, right: DecimalInput, decimals: number): string =>
    formatDecimalUnits(parseDecimalUnits(left, decimals) + parseDecimalUnits(right, decimals), decimals)

export const subtractDecimal = (left: DecimalInput, right: DecimalInput, decimals: number): string =>
    formatDecimalUnits(parseDecimalUnits(left, decimals) - parseDecimalUnits(right, decimals), decimals)

export const decimalToNumber = (value: DecimalInput): number => {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : 0
}

export const isPositiveDecimal = (value: DecimalInput, decimals = 18): boolean => {
    try {
        return parseDecimalUnits(value, decimals) > 0n
    } catch {
        return false
    }
}
