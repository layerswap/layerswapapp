export function isDiffByPercent(a, b, perc) {
    return Math.abs(a - b) / Math.abs(a) > perc / 100;
}


export function trimZeros(s: string) {
    return s.replace(/\.?0+$/, "");
}

export function formatTokenAmount(value: number, precision: number) {
    if (!isFinite(value) || value <= 0) return "0";
    return Number(value).toFixed(precision);
}
