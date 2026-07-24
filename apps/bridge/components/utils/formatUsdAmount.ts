export function formatUsd(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return '$0.00';
    if (amount > 0 && amount < 0.01) return '<$0.01';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/** Round down to 2 decimals — keeps max within the limit.
 *  Epsilon compensates for IEEE 754 errors (e.g. 0.29*100 = 28.999...) */
export function floorUsd(value: number): string {
    const cents = Math.floor(value * 100 + 1e-9);
    return (cents / 100).toFixed(2).replace(/\.?0+$/, '');
}

/** Round up to 2 decimals — keeps min above the limit.
 *  e.g. 0.17001 → "0.18", 0.17 → "0.17"
 *  Epsilon compensates for IEEE 754 errors (e.g. 0.56*100 = 56.0000...004) */
export function ceilUsd(value: number): string {
    const cents = Math.ceil(value * 100 - 1e-9);
    return (cents / 100).toFixed(2).replace(/\.?0+$/, '');
}