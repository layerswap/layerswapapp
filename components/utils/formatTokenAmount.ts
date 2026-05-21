/** Format a token amount without a known token precision.
 *  Picks decimals adaptively based on magnitude — useful for tier/range
 *  displays where the source token's precision isn't in scope.
 *  When you do have `token.precision`, prefer `truncateDecimals` from RoundDecimals.ts. */
export function formatTokenAmount(value: number): string {
    if (!Number.isFinite(value)) return '';
    if (value === 0) return '0';
    let maximumFractionDigits: number;
    if (value >= 1000) maximumFractionDigits = 0;
    else if (value >= 10) maximumFractionDigits = 2;
    else if (value >= 1) maximumFractionDigits = 4;
    else maximumFractionDigits = 6;
    return value.toLocaleString('en-US', { maximumFractionDigits });
}
