"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    TooltipContentProps,
    XAxis,
    YAxis,
} from "recharts";
import { AnalyticsRange, AnalyticsTimelinePoint, FLOW_COLORS } from "@/models/Analytics";
import { axisNum, axisUsd, bucketLabel, fmtNum, fmtUsdFull } from "./format";

type Basis = "usd" | "tx";

type Row = {
    label: string;
    inflow: number;
    outflow: number;
};

const AXIS_TICK = { fontSize: 11, fill: "var(--color-primary-text-tertiary)" };
const GRID_STROKE = "var(--color-secondary-400)";

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-[7px] text-[12.5px] text-secondary-text">
            <span className="h-[9px] w-[9px] rounded-[2px]" style={{ background: color }} />
            {label}
        </span>
    );
}

function ChartTooltip({
    active,
    payload,
    label,
    basis,
}: TooltipContentProps<number, string> & { basis: Basis }) {
    if (!active || payload.length === 0) return null;

    const formatter =
        basis === "tx" ? (value: number) => fmtNum(value) : (value: number) => fmtUsdFull(value);
    const total = payload.reduce((sum, entry) => sum + Number(entry.value ?? 0), 0);

    return (
        <div className="pointer-events-none min-w-[168px] rounded-[10px] border border-secondary-300 bg-secondary-700 px-3 py-2.5 shadow-accordion-open">
            <p className="mb-2 text-[11.5px] text-secondary-text">{label}</p>
            {payload.map((entry) => (
                <div
                    key={String(entry.dataKey)}
                    className="mb-1 flex items-center justify-between gap-5 text-xs"
                >
                    <span className="flex items-center gap-[7px] text-secondary-text">
                        <span
                            className="h-[9px] w-[9px] rounded-[2px]"
                            style={{ background: entry.color ?? entry.fill }}
                        />
                        {entry.name}
                    </span>
                    <span className="font-semibold tabular-nums text-primary-text">
                        {formatter(Number(entry.value ?? 0))}
                    </span>
                </div>
            ))}
            <div className="mt-2 flex items-center justify-between gap-5 border-t border-secondary-300 pt-1.5 text-xs">
                <span className="text-secondary-text">Total</span>
                <span className="font-semibold tabular-nums text-primary-text">{formatter(total)}</span>
            </div>
        </div>
    );
}

export default function VolumeChart({
    timeline,
    range,
}: {
    timeline: AnalyticsTimelinePoint[];
    range: AnalyticsRange;
}) {
    const [basis, setBasis] = useState<Basis>("usd");
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const rows: Row[] = useMemo(
        () =>
            timeline.map((point) => ({
                label: bucketLabel(point.bucket_start, range.bucket_size),
                inflow:
                    basis === "tx"
                        ? point.inflow_transfer_count
                        : point.inflow_amount_in_usd,
                outflow:
                    basis === "tx"
                        ? point.outflow_transfer_count
                        : point.outflow_amount_in_usd,
            })),
        [basis, range.bucket_size, timeline]
    );

    const hasData = rows.some((row) => row.inflow > 0 || row.outflow > 0);
    const axisFormatter = basis === "tx" ? axisNum : axisUsd;

    return (
        <section className="rounded-2xl border border-secondary-300 bg-secondary-500 p-[18px_14px_14px] shadow-card sm:p-[18px_20px_14px]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-[15px] font-semibold text-primary-text">
                        Volume over time
                    </h2>
                    <span className="text-[12.5px] text-primary-text-tertiary">
                        {`${basis === "tx" ? "Transfers" : "USD"} · per ${range.bucket_size}`}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4" aria-label="Chart legend">
                        <LegendDot color={FLOW_COLORS.inflow} label="Inflow" />
                        <LegendDot color={FLOW_COLORS.outflow} label="Outflow" />
                    </div>
                    <div className="flex items-center gap-1 rounded-[10px] border border-secondary-300 bg-secondary-700 p-1" role="group" aria-label="Chart metric">
                        {(["usd", "tx"] as Basis[]).map((metric) => (
                            <button
                                key={metric}
                                type="button"
                                onClick={() => setBasis(metric)}
                                aria-pressed={basis === metric}
                                className={`rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${basis === metric
                                    ? "bg-secondary-500 text-primary-text"
                                    : "text-primary-text-tertiary hover:text-secondary-text"
                                    }`}
                            >
                                {metric === "usd" ? "Volume" : "Transfers"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="h-[276px] w-full">
                {!mounted ? (
                    <div className="h-full animate-pulse rounded-xl bg-secondary-600" />
                ) : !hasData ? (
                    <div className="flex h-full items-center justify-center text-[13px] text-primary-text-tertiary">
                        {basis === "tx"
                            ? "No completed transfers in this range."
                            : "No volume in this range."}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <BarChart
                            accessibilityLayer
                            data={rows}
                            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                            barCategoryGap="18%"
                            maxBarSize={rows.length <= 10 ? 86 : 28}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke={GRID_STROKE}
                                strokeWidth={1}
                            />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                minTickGap={22}
                                interval="preserveStartEnd"
                                tick={AXIS_TICK}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                width={56}
                                tick={AXIS_TICK}
                                tickFormatter={axisFormatter}
                                allowDecimals={basis !== "tx"}
                            />
                            <Tooltip
                                cursor={{
                                    fill: "var(--color-secondary-400)",
                                    fillOpacity: 0.45,
                                }}
                                content={(props) => <ChartTooltip {...props} basis={basis} />}
                                isAnimationActive={false}
                            />
                            <Bar
                                dataKey="inflow"
                                name="Inflow"
                                stackId="volume"
                                fill={FLOW_COLORS.inflow}
                                isAnimationActive={false}
                            />
                            <Bar
                                dataKey="outflow"
                                name="Outflow"
                                stackId="volume"
                                fill={FLOW_COLORS.outflow}
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </section>
    );
}
