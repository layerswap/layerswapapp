export const formatAmount = (amount: number | undefined): string => {
    if (amount === undefined || isNaN(amount)) {
        return '-';
    }

    if (amount < 1000) amount

    if (amount === 0) '0.00'

    return amount.toLocaleString(undefined, {
        maximumFractionDigits: 12,
    });
};