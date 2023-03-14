export default function truncateDecimals(value: number, decimals: number) {
    return Number((Number(value + 'e' + decimals)) + 'e-' + decimals);
}

export function roundDecimals(value: number, decimals: number) {
    if (decimals === 1) {
        decimals = 0
    }
    return Number(Math.ceil(Number(value + 'e' + decimals)) + 'e-' + decimals);
}