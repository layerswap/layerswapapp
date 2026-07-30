// Value formatters ported from the Claude Design mock (chart.jsx / DCLogic).

/** Compact USD: $1.23B / $4.56M / $7.8K / $12 / <$0.01 / $0 */
export function fmtUsd(v: number): string {
    v = +v || 0;
    const a = Math.abs(v);
    let s: string;
    if (a >= 1e9) s = (a / 1e9).toFixed(2) + "B";
    else if (a >= 1e6) s = (a / 1e6).toFixed(2) + "M";
    else if (a >= 1e3) s = (a / 1e3).toFixed(1) + "K";
    else if (a >= 1) s = a.toFixed(0);
    else if (a > 0) return (v < 0 ? "-" : "") + "<$0.01";
    else s = "0";
    return (v < 0 ? "-$" : "$") + s;
}

/** Compact transfer counts: 9,999 / 12.3K / 4.56M */
export function fmtNum(v: number): string {
    v = Math.round(+v || 0);
    const a = Math.abs(v);
    if (a < 10000) return v.toLocaleString("en-US");
    if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
    return (v / 1e3).toFixed(1) + "K";
}

/** Axis tick — USD */
export function axisUsd(v: number): string {
    const a = Math.abs(v);
    if (a >= 1e9) return "$" + (a / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B";
    if (a >= 1e6) return "$" + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
    if (a >= 1e3) return "$" + (a / 1e3).toFixed(0) + "K";
    return "$" + a.toFixed(0);
}

/** Axis tick — transaction count */
export function axisNum(v: number): string {
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(0) + "K";
    return String(v);
}

/** Percentage: 0.523 -> "52.3%" */
export function pct(x: number): string {
    return ((+x || 0) * 100).toFixed(1) + "%";
}

/** Precise USD for tooltips: $1,234,567.89 */
export function fmtUsdFull(v: number): string {
    v = +v || 0;
    return (
        (v < 0 ? "-$" : "$") +
        Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
}

/** Bucket-start label formatting driven by the response bucket size. */
export function bucketLabel(iso: string, bucket: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    if (bucket === "hour") {
        return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", timeZone: "UTC" });
    }
    // day / week
    return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
