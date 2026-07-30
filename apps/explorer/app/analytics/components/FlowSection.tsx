"use client";

import { AnalyticsCounterparty, AnalyticsNetwork, FLOW_COLORS } from "@/models/Analytics";
import { fmtNum, fmtUsd } from "./format";
import { NetworkBadge } from "./ChainSelector";

function FlowColumn({
    title,
    subtitle,
    rows,
    color,
}: {
    title: string;
    subtitle: string;
    rows: AnalyticsCounterparty[];
    color: string;
}) {
    const max = Math.max(1, ...rows.map((r) => r.amount_in_usd));
    return (
        <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-3">
                <span className="text-[13.5px] font-semibold text-[#e1e3e6]">{title}</span>
                <span className="text-[11.5px] text-[#768093]">{subtitle}</span>
            </div>
            {rows.length === 0 ? (
                <div className="text-[13px] text-[#768093] py-4">No activity in this range.</div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {rows.map((r) => {
                        const pct = (r.amount_in_usd / max) * 100;
                        return (
                            <div key={r.network.name} className="flex items-center gap-3">
                                <NetworkBadge network={r.network} size={22} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[13px] text-[#e1e3e6] truncate">{r.network.display_name}</span>
                                        <span className="text-[12.5px] text-[#a3adc2] tabular-nums shrink-0">
                                            {fmtUsd(r.amount_in_usd)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-[6px] rounded-full bg-[#0e1524] overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: color }} />
                                        </div>
                                        <span className="text-[11px] text-[#768093] tabular-nums shrink-0 w-16 text-right">
                                            {fmtNum(r.transfer_count)} txns
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
    const name = network?.display_name ?? "this network";
    return (
        <div className="bg-[#171f31] border border-[#283247] rounded-2xl p-[18px_20px] shadow-[0_1px_2px_rgba(0,0,0,.28)]">
            <div className="flex flex-col gap-[3px] mb-4">
                <span className="text-[15px] font-semibold text-[#e1e3e6]">Flow by network</span>
                <span className="text-[12.5px] text-[#a3adc2]">
                    Where {name}&rsquo;s volume comes from and goes to
                </span>
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <FlowColumn
                    title="Sources"
                    subtitle="inflow · from"
                    rows={sourceChains}
                    color={FLOW_COLORS.inflow}
                />
                <div className="hidden md:block w-px bg-[#1f283d] self-stretch" />
                <FlowColumn
                    title="Destinations"
                    subtitle="outflow · to"
                    rows={destinationChains}
                    color={FLOW_COLORS.outflow}
                />
            </div>
        </div>
    );
}
