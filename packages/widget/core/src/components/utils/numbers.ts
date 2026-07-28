export function isDiffByPercent(a, b, perc) {
    return Math.abs(a - b) / Math.abs(a) > perc / 100;
}