"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
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

const AXIS_TICK = { fontSize: 11, fill: "#768093" };
const GRID_STROKE = "#1f283d";

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-[7px] text-[12.5px] text-[#a3adc2]">
            <span className="w-[9px] h-[9px] rounded-[2px]" style={{ background: color }} />
            {label}
        </span>
    );
}

function ChartTooltip({ active, payload, label, basis }: any) {
    if (!active || !payload || !payload.length) return null;
    const fmt = basis === "tx" ? (v: number) => fmtNum(v) : (v: number) => fmtUsdFull(v);
    const total = payload.reduce((s: number, p: any) => s + (+p.value || 0), 0);
    return (
        <div className="bg-[#0e1524] border border-[#283247] rounded-[10px] px-3 py-[9px] min-w-[154px] shadow-[0_8px_24px_rgba(0,0,0,.5)] pointer-events-none">
            <div className="text-[11.5px] text-[#a3adc2] mb-[7px]">{label}</div>
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4 text-[12.5px] mb-1">
                    <span className="flex items-center gap-[7px] text-[#a3adc2]">
                        <span className="w-[9px] h-[9px] rounded-[2px]" style={{ background: p.color || p.fill }} />
                        {p.name}
                    </span>
                    <span className="text-[#e1e3e6] font-semibold tabular-nums">{fmt(p.value)}</span>
                </div>
            ))}
            <div className="flex items-center justify-between gap-4 text-[12.5px] border-t border-[#283247] pt-1.5 mt-0.5">
                <span className="text-[#a3adc2]">Total</span>
                <span className="text-white font-semibold tabular-nums">{fmt(total)}</span>
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
            timeline.map((t) => ({
                label: bucketLabel(t.bucket_start, range.bucket_size),
                inflow: basis === "tx" ? t.inflow_transfer_count : t.inflow_amount_in_usd,
                outflow: basis === "tx" ? t.outflow_transfer_count : t.outflow_amount_in_usd,
            })),
        [timeline, range.bucket_size, basis]
    );

    const hasData = rows.some((r) => r.inflow > 0 || r.outflow > 0);
    const axisFmt = basis === "tx" ? axisNum : axisUsd;

    return (
        <div className="bg-[#171f31] border border-[#283247] rounded-2xl p-[18px_20px_14px] shadow-[0_1px_2px_rgba(0,0,0,.28)]">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-baseline gap-3">
                    <span className="text-[15px] font-semibold text-[#e1e3e6]">Volume over time</span>
                    <span className="text-[12.5px] text-[#768093]">
                        {basis === "tx" ? "Transfers" : "USD"} · per {range.bucket_size}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4">
                        <LegendDot color={FLOW_COLORS.inflow} label="Inflow" />
                        <LegendDot color={FLOW_COLORS.outflow} label="Outflow" />
                    </div>
                    <div className="flex items-center gap-1 bg-[#0e1524] border border-[#283247] rounded-[10px] p-1">
                        {(["usd", "tx"] as Basis[]).map((b) => (
                            <button
                                key={b}
                                type="button"
                                onClick={() => setBasis(b)}
                                aria-pressed={basis === b}
                                className={`px-2.5 py-1 rounded-[7px] text-[12px] font-semibold transition-colors ${basis === b ? "bg-[#171f31] text-[#e1e3e6]" : "text-[#768093] hover:text-[#a3adc2]"
                                    }`}
                            >
                                {b === "usd" ? "Volume" : "Transactions"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="h-[300px] mt-0.5">
                {!mounted ? (
                    <div className="h-full flex items-center justify-center text-[13px] text-[#768093]">
                        Loading chart…
                    </div>
                ) : !hasData ? (
                    <div className="h-full flex items-center justify-center text-[13px] text-[#768093]">
                        No volume in this range.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" debounce={1}>
                        <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="18%" maxBarSize={86}>
                            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeWidth={1} />
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
                                tickFormatter={axisFmt}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: "rgba(255,255,255,0.045)" }}
                                content={(p: any) => <ChartTooltip {...p} basis={basis} />}
                                isAnimationActive={false}
                            />
                            <Bar dataKey="inflow" name="Inflow" stackId="v" fill={FLOW_COLORS.inflow} isAnimationActive={false} />
                            <Bar dataKey="outflow" name="Outflow" stackId="v" fill={FLOW_COLORS.outflow} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
