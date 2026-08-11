"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnalyticsCounterparty, AnalyticsNetwork, FLOW_COLORS } from "@/models/Analytics";
import { fmtNum, fmtUsd } from "./format";
import { NetworkBadge } from "./ChainSelector";

const VISIBLE_ROWS = 5;

function FlowColumn({
    title,
    subtitle,
    rows,
    max,
    color,
}: {
    title: string;
    subtitle: string;
    rows: AnalyticsCounterparty[];
    max: number;
    color: string;
}) {
    return (
        <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-3">
                <span className="text-[13.5px] font-semibold text-primary-text">{title}</span>
                <span className="text-[11.5px] text-primary-text-tertiary">{subtitle}</span>
            </div>
            {rows.length === 0 ? (
                <div className="py-4 text-[13px] text-primary-text-tertiary">No activity in this range.</div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {rows.map((r) => {
                        const share = (r.amount_in_usd / max) * 100;
                        const barWidth = share > 0 ? Math.max(2, share) : 0;
                        return (
                            <div key={r.network.name} className="flex items-center gap-3">
                                <NetworkBadge network={r.network} size={22} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="truncate text-[13px] text-primary-text">{r.network.display_name}</span>
                                        <span className="shrink-0 text-[12.5px] tabular-nums text-secondary-text">
                                            {fmtUsd(r.amount_in_usd)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-secondary-700">
                                            <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: color }} />
                                        </div>
                                        <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-primary-text-tertiary">
                                            {fmtNum(r.transfer_count)}
                                            <span className="sr-only"> transfers</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function FlowSection({
    network,
    sourceChains,
    destinationChains,
}: {
    network: AnalyticsNetwork | null;
    sourceChains: AnalyticsCounterparty[];
    destinationChains: AnalyticsCounterparty[];
}) {
    const [expanded, setExpanded] = useState(false);
    const hiddenCount = Math.max(
        sourceChains.length - VISIBLE_ROWS,
        destinationChains.length - VISIBLE_ROWS,
        0
    );
    const sharedMax = Math.max(1, ...sourceChains.map((r) => r.amount_in_usd), ...destinationChains.map((r) => r.amount_in_usd));
    const name = network?.display_name ?? "this network";
    return (
        <div className="rounded-2xl border border-secondary-300 bg-secondary-500 p-[18px_20px] shadow-card">
            <div className="flex flex-col gap-[3px] mb-4">
                <span className="text-[15px] font-semibold text-primary-text">Flow by network</span>
                <span className="text-[12.5px] text-secondary-text">
                    Where {name}&rsquo;s volume comes from and goes to
                </span>
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <FlowColumn
                    title="Sources"
                    subtitle="Inflow · from"
                    rows={expanded ? sourceChains : sourceChains.slice(0, VISIBLE_ROWS)}
                    max={sharedMax}
                    color={FLOW_COLORS.inflow}
                />
                <div className="hidden w-px self-stretch bg-secondary-400 md:block" />
                <FlowColumn
                    title="Destinations"
                    subtitle="Outflow · to"
                    rows={expanded ? destinationChains : destinationChains.slice(0, VISIBLE_ROWS)}
                    max={sharedMax}
                    color={FLOW_COLORS.outflow}
                />
            </div>
            {hiddenCount > 0 ? (
                <div className="mt-4 border-t border-secondary-400">
                    <button type="button" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="flex w-full items-center justify-center gap-1 pt-3 pb-0.5 text-center text-[12.5px] font-semibold text-secondary-text transition-colors hover:text-primary-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400">
                        {expanded ? "Show less" : "Show all counterparty chains"}
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                </div>
            ) : null}
        </div>
    );
}
