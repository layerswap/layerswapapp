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