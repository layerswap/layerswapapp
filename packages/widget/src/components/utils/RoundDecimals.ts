/** Display formatter: truncates to `decimals` and adds thousands separators (returns a
 * localized string, e.g. "1,234.56"). Use for UI text, not for amount math. */
export function truncateDecimals(value: number, decimals = 0) {
    if (value === 0) return '0';

    const factor = Math.pow(10, decimals);
    const truncated = Math.trunc(value * factor) / factor;

    const formatted = isScientific(truncated)
        ? (!isNaN(Number(truncated))
            ? truncated.toFixed(decimals).replace(/\.?0+$/, '')
            : '')
        : truncated?.toString();

    return Number(formatted).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
    });
}

/** Ceil to `decimals` (number in, number out). Values already representable at
 * `decimals` pass through unchanged — a raw `Math.ceil(value * factor)` would
 * bump them a full step up on float dust (0.1 * 1e6 === 100000.00000000001). */
export function ceilToDecimals(value: number, decimals: number): number {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** decimals;
    const nearest = Number(value.toFixed(decimals));
    if (nearest >= value) return nearest;
    return Number((nearest + 1 / factor).toFixed(decimals));
}

/**
 * Amount floor: truncates a decimal string to `decimals` with no separators (returns a
 * plain string). String-based for the common case to avoid float precision loss, with a
 * numeric fallback for scientific notation. Use for on-chain/transfer amounts.
 */
export function truncateToDecimals(value: string, decimals: number): string {
    const v = value.trim()
    if (/^\d+(\.\d+)?$/.test(v)) {
        const [int, frac = ''] = v.split('.')
        if (frac.length <= decimals) return v
        const truncated = frac.slice(0, decimals)
        return truncated.length ? `${int}.${truncated}` : int
    }
    const n = Number(v)
    if (!Number.isFinite(n)) return v
    const factor = 10 ** decimals
    return (Math.floor(n * factor) / factor).toString()
}

/** Numeric round to `decimals` (number in, number out). Non-finite inputs (e.g. Infinity
 * from a divide-by-zero price) return 0 — isNaN() misses Infinity. */
export function roundToDecimals(value: number, decimals: number | undefined) {
    if (!Number.isFinite(value)) return 0;
    return decimals !== undefined ? Number(value.toFixed(decimals)) : value;
}

export function isScientific(x) {
    const s = String(x);

    // 1) If it’s already a string that “looks like” sci-notation, catch it:
    if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(s)) {
        return true;
    }

    // 2) Otherwise, convert to Number (in case it's a numeric string or other) 
    //    and see if toString() uses 'e' (lowercased for consistency):
    return Number(s).toString().toLowerCase().includes('e');
}