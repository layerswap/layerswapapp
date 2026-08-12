// Value formatters ported from the Claude Design mock (chart.jsx / DCLogic).

import { AnalyticsRange, AnalyticsTimelinePoint } from "@/models/Analytics";

/** Compact USD: $1.23B / $4.56M / $7.8K / $12.34 / <$0.01 / $0 */
export function fmtUsd(v: number): string {
    v = +v || 0;
    const a = Math.abs(v);
    let s: string;
    if (a >= 1e9) s = (a / 1e9).toFixed(2) + "B";
    else if (a >= 1e6) s = (a / 1e6).toFixed(2) + "M";
    else if (a >= 1e3) s = (a / 1e3).toFixed(1) + "K";
    else if (a >= 1) {
        s = a.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    }
    else if (a >= 0.01) s = a.toFixed(2);
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

const EMPTY_TIMELINE_POINT = {
    inflow_transfer_count: 0,
    outflow_transfer_count: 0,
    inflow_amount_in_usd: 0,
    outflow_amount_in_usd: 0,
} as const;

function floorUtcBucket(value: number, bucket: string): number {
    const date = new Date(value);
    return bucket === "hour"
        ? Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            date.getUTCHours()
        )
        : Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * The analytics endpoint deliberately omits empty buckets. Restore them so
 * gaps remain visible and time spacing stays truthful in charts/sparklines.
 */
export function fillTimelineGaps(
    timeline: AnalyticsTimelinePoint[],
    range: AnalyticsRange
): AnalyticsTimelinePoint[] {
    const from = Date.parse(range.from);
    const to = Date.parse(range.to);
    const step = range.bucket_size === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
        return [...timeline].sort(
            (a, b) => Date.parse(a.bucket_start) - Date.parse(b.bucket_start)
        );
    }

    const pointsByBucket = new Map<number, AnalyticsTimelinePoint>();
    for (const point of timeline) {
        const parsed = Date.parse(point.bucket_start);
        if (Number.isFinite(parsed)) {
            pointsByBucket.set(floorUtcBucket(parsed, range.bucket_size), point);
        }
    }

    const filled: AnalyticsTimelinePoint[] = [];
    for (let cursor = floorUtcBucket(from, range.bucket_size); cursor < to; cursor += step) {
        filled.push(
            pointsByBucket.get(cursor) ?? {
                bucket_start: new Date(cursor).toISOString(),
                ...EMPTY_TIMELINE_POINT,
            }
        );
    }

    return filled;
}

export function generatedAtLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently updated";

    return `Updated ${date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
    })}`;
}
