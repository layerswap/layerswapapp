"use client";

import { AnalyticsTimelinePoint, AnalyticsTotals, FLOW_COLORS } from "@/models/Analytics";
import { fmtNum, fmtUsd, pct } from "./format";
import Sparkline from "./Sparkline";

type Card = {
    label: string;
    dotColor: string;
    valueMain: string;
    valueSub: string;
    spark: number[];
    sparkColor: string;
};

export default function SummaryCards({
    totals,
    timeline,
    assetsCount,
}: {
    totals: AnalyticsTotals;
    timeline: AnalyticsTimelinePoint[];
    assetsCount: number;
}) {
    const totalIn = totals.inflow.amount_in_usd;
    const totalOut = totals.outflow.amount_in_usd;
    const totalVol = totalIn + totalOut;
    const txTotal = totals.inflow.transfer_count + totals.outflow.transfer_count;
    const avgSize = txTotal > 0 ? totalVol / txTotal : 0;
    const net = totals.net_amount_in_usd;

    // Keep the direction cues within the shared Explorer palette.
    const netDot = net >= 0 ? FLOW_COLORS.inflow : FLOW_COLORS.outflow;
    const netSpark = net >= 0 ? FLOW_COLORS.positive : FLOW_COLORS.negative;

    const cards: Card[] = [
        {
            label: "Total volume",
            dotColor: FLOW_COLORS.outflow,
            valueMain: fmtUsd(totalVol),
            valueSub: `${fmtNum(txTotal)} transfers · ${assetsCount} ${assetsCount === 1 ? "asset" : "assets"}`,
            spark: timeline.map((t) => t.inflow_amount_in_usd + t.outflow_amount_in_usd),
            sparkColor: FLOW_COLORS.outflow,
        },
        {
            label: "Inflow",
            dotColor: FLOW_COLORS.inflow,
            valueMain: fmtUsd(totalIn),
            valueSub: `${pct(totalIn / (totalVol || 1))} of volume`,
            spark: timeline.map((t) => t.inflow_amount_in_usd),
            sparkColor: FLOW_COLORS.inflow,
        },
        {
            label: "Outflow",
            dotColor: FLOW_COLORS.outflow,
            valueMain: fmtUsd(totalOut),
            valueSub: `${pct(totalOut / (totalVol || 1))} of volume`,
            spark: timeline.map((t) => t.outflow_amount_in_usd),
            sparkColor: FLOW_COLORS.outflow,
        },
        {
            label: "Net flow",
            dotColor: netDot,
            valueMain: `${net > 0 ? "+" : ""}${fmtUsd(net)}`,
            valueSub: net >= 0 ? "Net inflow" : "Net outflow",
            spark: timeline.map((t) => t.inflow_amount_in_usd - t.outflow_amount_in_usd),
            sparkColor: netSpark,
        },
        {
            label: "Transfers",
            dotColor: FLOW_COLORS.neutral,
            valueMain: fmtNum(txTotal),
            valueSub: `${fmtUsd(avgSize)} avg size`,
            spark: timeline.map((t) => t.inflow_transfer_count + t.outflow_transfer_count),
            sparkColor: FLOW_COLORS.neutral,
        },
    ];

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-secondary-300 bg-secondary-500 shadow-card sm:flex-row sm:flex-wrap lg:flex-nowrap">
            {cards.map((c, i) => (
                <div key={c.label} className="relative flex min-w-0 flex-1 basis-1/2 flex-col gap-3 border-t border-secondary-400 p-[16px_18px] first:border-t-0 sm:border-t-0 lg:basis-0">
                    {i > 0 && (
                        <span className="absolute bottom-4 left-0 top-4 hidden w-px bg-secondary-400 lg:block" />
                    )}
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: c.dotColor }} />
                        <span className="whitespace-nowrap text-[12.5px] text-secondary-text">{c.label}</span>
                    </div>
                    <div className="flex flex-col gap-[3px]">
                        <span className="text-2xl font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums text-primary-text">
                            {c.valueMain}
                        </span>
                        <span className="truncate text-[11.5px] text-primary-text-tertiary">{c.valueSub}</span>
                    </div>
                    <div className="flex items-end justify-end mt-0.5 h-7">
                        <Sparkline values={c.spark} color={c.sparkColor} />
                    </div>
                </div>
            ))}
        </div>
    );
}
