/** Format a percentage value (already in percent units, e.g. 0.0002 → "0.0002%").
 *  Uses adaptive precision so small fees don't collapse to "0.00%". */
export function formatPercent(value: number | undefined | null): string {
    if (value === undefined || value === null || value <= 0) return '';
    if (value >= 0.01) return `${value.toFixed(2)}%`;
    if (value < 0.0001) return '<0.0001%';

    const firstSig = Math.floor(-Math.log10(value));
    const decimals = Math.min(6, firstSig + 2);
    const formatted = value.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
    return `${formatted}%`;
}
