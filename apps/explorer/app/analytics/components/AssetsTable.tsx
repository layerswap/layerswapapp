"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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

export default function AssetsTable({ assets }: { assets: AnalyticsAsset[] }) {
    const [sortKey, setSortKey] = useState<SortKey>("vol");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

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
    const totals = {
        vol: totalVol,
        inUsd: rows.reduce((s, r) => s + r.inUsd, 0),
        outUsd: rows.reduce((s, r) => s + r.outUsd, 0),
        txns: rows.reduce((s, r) => s + r.txns, 0),
    };

    const sorted = useMemo(() => {
        const copy = [...rows];
        copy.sort((a, b) => {
            const d = metric(b, sortKey) - metric(a, sortKey);
            return sortDir === "desc" ? d : -d;
        });
        return copy;
    }, [rows, sortKey, sortDir]);

    const toggle = (key: SortKey) => {
        if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const caret = (key: SortKey) => (key === sortKey ? (sortDir === "desc" ? " ↓" : " ↑") : "");
    const colColor = (key: SortKey) => (key === sortKey ? "#e1e3e6" : "#768093");

    const th = "px-[10px] py-2 text-[11.5px] font-semibold tracking-[0.04em]";
    const sortBtn = (key: SortKey, label: string) => (
        <button
            type="button"
            onClick={() => toggle(key)}
            className="bg-transparent border-0 cursor-pointer font-semibold text-[11.5px] tracking-[0.04em]"
            style={{ color: colColor(key) }}
        >
            {label}
            {caret(key)}
        </button>
    );

    return (
        <div className="bg-[#171f31] border border-[#283247] rounded-2xl p-[18px_20px_8px] shadow-[0_1px_2px_rgba(0,0,0,.28)]">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-[15px] font-semibold text-[#e1e3e6]">Assets</span>
                <span className="text-[12.5px] text-[#768093]">
                    {rows.length} {rows.length === 1 ? "asset" : "assets"}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                    <thead>
                        <tr>
                            <th className={`${th} w-[44px] text-left text-[#768093]`}>#</th>
                            <th className={`${th} text-left text-[#768093]`}>ASSET</th>
                            <th className={`${th} text-right`}>{sortBtn("vol", "VOLUME")}</th>
                            <th className={`${th} text-right`}>{sortBtn("in", "INFLOW")}</th>
                            <th className={`${th} text-right`}>{sortBtn("out", "OUTFLOW")}</th>
                            <th className={`${th} w-[184px] text-left text-[#768093]`}>SHARE OF VOLUME</th>
                            <th className={`${th} text-right`}>{sortBtn("tx", "TXNS")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-[10px] py-6 text-center text-[13px] text-[#768093]">
                                    No asset activity in this range.
                                </td>
                            </tr>
                        )}
                        {sorted.map((r, i) => {
                            const share = totalVol > 0 ? (r.vol / totalVol) * 100 : 0;
                            return (
                                <tr key={r.asset} className="border-t border-[#1f283d] hover:bg-[#0f1c3a] transition-colors">
                                    <td className="px-[10px] py-[11px] text-[#768093] text-[13px] tabular-nums">{i + 1}</td>
                                    <td className="px-[10px] py-[11px]">
                                        <span className="flex items-center gap-[11px] min-w-0">
                                            {r.logo ? (
                                                <Image src={r.logo} alt={r.asset} width={24} height={24} decoding="async" className="rounded-full shrink-0" />
                                            ) : (
                                                <span className="w-6 h-6 rounded-full bg-[#283247] shrink-0" />
                                            )}
                                            <span className="text-[14px] font-semibold text-[#e1e3e6]">{r.asset}</span>
                                        </span>
                                    </td>
                                    <td className="px-[10px] py-[11px] text-right text-[14px] text-[#e1e3e6] tabular-nums">{fmtUsd(r.vol)}</td>
                                    <td className="px-[10px] py-[11px] text-right text-[13.5px] tabular-nums" style={{ color: FLOW_COLORS.inflow }}>{fmtUsd(r.inUsd)}</td>
                                    <td className="px-[10px] py-[11px] text-right text-[13.5px] tabular-nums" style={{ color: FLOW_COLORS.outflow }}>{fmtUsd(r.outUsd)}</td>
                                    <td className="px-[10px] py-[11px]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex-1 h-[6px] rounded-full bg-[#0e1524] overflow-hidden">
                                                <div className="h-full rounded-full bg-[#3c4861]" style={{ width: `${Math.max(2, share)}%` }} />
                                            </div>
                                            <span className="text-[11.5px] text-[#768093] tabular-nums w-10 text-right">{share.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-[10px] py-[11px] text-right text-[13.5px] text-[#e1e3e6] tabular-nums">{fmtNum(r.txns)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {sorted.length > 0 && (
                        <tfoot>
                            <tr className="border-t border-[#283247]">
                                <td className="px-[10px] py-[13px]" />
                                <td className="px-[10px] py-[13px] text-[13px] font-semibold text-[#a3adc2]">Total</td>
                                <td className="px-[10px] py-[13px] text-right text-[14px] font-semibold text-[#e1e3e6] tabular-nums">{fmtUsd(totals.vol)}</td>
                                <td className="px-[10px] py-[13px] text-right text-[13.5px] font-semibold tabular-nums" style={{ color: FLOW_COLORS.inflow }}>{fmtUsd(totals.inUsd)}</td>
                                <td className="px-[10px] py-[13px] text-right text-[13.5px] font-semibold tabular-nums" style={{ color: FLOW_COLORS.outflow }}>{fmtUsd(totals.outUsd)}</td>
                                <td className="px-[10px] py-[13px]" />
                                <td className="px-[10px] py-[13px] text-right text-[13.5px] font-semibold text-[#e1e3e6] tabular-nums">{fmtNum(totals.txns)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
