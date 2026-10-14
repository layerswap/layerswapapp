/** Format token amounts with adaptive decimals by default.
 *  Options can override the decimal precision and grouping. */
export function formatTokenAmount(value: number, options?: Intl.NumberFormatOptions): string {
    if (!Number.isFinite(value)) return '';
    if (value === 0) return '0';
    let maximumFractionDigits: number;
    if (value >= 1000) maximumFractionDigits = 0;
    else if (value >= 10) maximumFractionDigits = 2;
    else if (value >= 1) maximumFractionDigits = 4;
    else maximumFractionDigits = 6;
    return value.toLocaleString('en-US', { maximumFractionDigits, ...options });
}
