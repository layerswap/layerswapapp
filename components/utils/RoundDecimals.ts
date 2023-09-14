export function roundDecimals(value: number, decimals: number) {
    if (decimals === 1) {
        decimals = 0
    }
    return Number(Math.ceil(Number(value + 'e' + decimals)) + 'e-' + decimals);
}

export function truncateDecimals(value: number, decimals: number): string {
    if (!decimals)
        return '0'
    if (Math.pow(10, decimals) * value >= 1) {
        return Number(value).toFixed(decimals)
    }
    else if (decimals >= 18) return '0'
    else return truncateDecimals(value, ++decimals);
}