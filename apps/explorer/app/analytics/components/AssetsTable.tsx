"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { AnalyticsAsset, FLOW_COLORS } from "@/models/Analytics";
import { fmtNum, fmtUsd } from "./format";

type SortKey = "vol" | "in" | "out" | "tx";

type Row = {
    asset: string;
    logo: string;
    vol: number;
    inUsd: number;
    outUsd: number;
    txns: number;
};

function metric(r: Row, key: SortKey): number {
    switch (key) {
        case "in": return r.inUsd;
        case "out": return r.outUsd;
        case "tx": return r.txns;
        default: return r.vol;
    }
}

const VISIBLE_ROWS = 8;

export default function AssetsTable({ assets }: { assets: AnalyticsAsset[] }) {
    const [sortKey, setSortKey] = useState<SortKey>("vol");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
    const [expanded, setExpanded] = useState(false);

    const rows: Row[] = useMemo(
        () =>
            assets.map((a) => ({
                asset: a.asset,
                logo: a.logo,
                vol: a.inflow.amount_in_usd + a.outflow.amount_in_usd,
                inUsd: a.inflow.amount_in_usd,
                outUsd: a.outflow.amount_in_usd,
                txns: a.inflow.transfer_count + a.outflow.transfer_count,
            })),
        [assets]
    );

    const totalVol = rows.reduce((s, r) => s + r.vol, 0);

    const sorted = useMemo(() => {
        const copy = [...rows];
        copy.sort((a, b) => {
            const d = metric(b, sortKey) - metric(a, sortKey);
            const directed = sortDir === "desc" ? d : -d;
            return directed || a.asset.localeCompare(b.asset);
        });
        return copy;
    }, [rows, sortKey, sortDir]);

    const visibleRows = expanded ? sorted : sorted.slice(0, VISIBLE_ROWS);
    const hiddenCount = sorted.length - VISIBLE_ROWS;

    const toggle = (key: SortKey) => {
        if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const caret = (key: SortKey) => (key === sortKey ? (sortDir === "desc" ? " ↓" : " ↑") : "");
    const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
        key === sortKey ? (sortDir === "desc" ? "descending" : "ascending") : "none";

    const th = "px-[10px] py-2 text-[11.5px] font-semibold tracking-[0.04em]";
    const sortBtn = (key: SortKey, label: string) => (
        <button
            type="button"
            onClick={() => toggle(key)}
            aria-label={`Sort by ${label.toLowerCase()}`}
            className={`cursor-pointer border-0 bg-transparent text-[11.5px] font-semibold tracking-[0.04em] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${key === sortKey ? "text-primary-text" : "text-primary-text-tertiary"}`}
        >
            {label}
            {caret(key)}
        </button>
    );

    return (
        <div className="rounded-2xl border border-secondary-300 bg-secondary-500 p-[18px_20px_8px] shadow-card">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-[15px] font-semibold text-primary-text">Assets</span>
                <span className="text-[12.5px] text-primary-text-tertiary">
                    {rows.length} {rows.length === 1 ? "asset" : "assets"}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse min-w-[760px]">
                    <thead>
                        <tr>
                            <th scope="col" className={`${th} w-[44px] text-left text-primary-text-tertiary`}>#</th>
                            <th scope="col" className={`${th} text-left text-primary-text-tertiary`}>ASSET</th>
                            <th scope="col" aria-sort={ariaSort("vol")} className={`${th} w-[104px] text-right`}>{sortBtn("vol", "VOLUME")}</th>
                            <th scope="col" aria-sort={ariaSort("in")} className={`${th} w-[104px] text-right`}>{sortBtn("in", "INFLOW")}</th>
                            <th scope="col" aria-sort={ariaSort("out")} className={`${th} w-[104px] text-right`}>{sortBtn("out", "OUTFLOW")}</th>
                            <th scope="col" className={`${th} w-[184px] text-left text-primary-text-tertiary`}>SHARE OF VOLUME</th>
                            <th scope="col" aria-sort={ariaSort("tx")} className={`${th} w-[112px] text-right`}>{sortBtn("tx", "TRANSFERS")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-[10px] py-6 text-center text-[13px] text-primary-text-tertiary">
                                    No asset activity in this range.
                                </td>
                            </tr>
                        )}
                        {visibleRows.map((r, i) => {
                            const share = totalVol > 0 ? (r.vol / totalVol) * 100 : 0;
                            const shareWidth = share > 0 ? Math.max(2, share) : 0;
                            return (
                                <tr key={r.asset} className="border-t border-secondary-400">
                                    <td className="px-[10px] py-[11px] text-[13px] tabular-nums text-primary-text-tertiary">{i + 1}</td>
                                    <td className="px-[10px] py-[11px]">
                                        <span className="flex items-center gap-[11px] min-w-0">
                                            {r.logo ? (
                                                <Image src={r.logo} alt={r.asset} width={24} height={24} decoding="async" className="rounded-full shrink-0" />
                                            ) : (
                                                <span className="h-6 w-6 shrink-0 rounded-full bg-secondary-300" />
                                            )}
                                            <span className="text-[14px] font-semibold text-primary-text">{r.asset}</span>
                                        </span>
                                    </td>
                                    <td className="px-[10px] py-[11px] text-right text-[14px] tabular-nums text-primary-text">{fmtUsd(r.vol)}</td>
                                    <td className="px-[10px] py-[11px] text-right text-[13.5px] tabular-nums" style={{ color: FLOW_COLORS.inflow }}>{fmtUsd(r.inUsd)}</td>
                                    <td className="px-[10px] py-[11px] text-right text-[13.5px] tabular-nums" style={{ color: FLOW_COLORS.outflow }}>{fmtUsd(r.outUsd)}</td>
                                    <td className="px-[10px] py-[11px]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-secondary-700">
                                                <div className="h-full rounded-full bg-secondary-100" style={{ width: `${shareWidth}%` }} />
                                            </div>
                                            <span className="w-10 text-right text-[11.5px] tabular-nums text-primary-text-tertiary">{share.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-[10px] py-[11px] text-right text-[13.5px] tabular-nums text-primary-text">{fmtNum(r.txns)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {hiddenCount > 0 ? (
                <div className="border-t border-secondary-400">
                    <button type="button" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="flex w-full items-center justify-center gap-1 py-2.5 text-center text-[12.5px] font-semibold text-secondary-text transition-colors hover:text-primary-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400">
                        {expanded ? "Show less" : `Show all ${sorted.length} assets`}
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                </div>
            ) : null}
        </div>
    );
}
