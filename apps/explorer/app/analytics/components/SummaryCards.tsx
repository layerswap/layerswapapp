"use client";
import { useMemo } from "react";
import Image from "next/image";
import { AnalyticsAsset, AnalyticsTotals, FLOW_COLORS, } from "@/models/Analytics";
import { fmtUsd, pct } from "./format";

const nfmt = (v: number) => Math.round(v || 0).toLocaleString("en-US");

const CARD_CLASS = "flex min-w-0 flex-col gap-[7px] rounded-[14px] border border-secondary-300 bg-secondary-500 p-[13px_15px_12px] shadow-card";

export default function SummaryCards({ totals, assets, }: { totals: AnalyticsTotals; assets: AnalyticsAsset[]; }) {
    const totalIn = totals.inflow.amount_in_usd;
    const totalOut = totals.outflow.amount_in_usd;
    const totalVol = totalIn + totalOut;
    const txIn = totals.inflow.transfer_count;
    const txOut = totals.outflow.transfer_count;
    const txTotal = txIn + txOut;
    const avgSize = txTotal > 0 ? totalVol / txTotal : 0;
    const inPct = totalVol ? (totalIn / totalVol) * 100 : 0;
    const outPct = totalVol ? (totalOut / totalVol) * 100 : 0;

    const topAsset = useMemo(() => {
        let top: AnalyticsAsset | null = null;
        let topVol = 0;
        for (const asset of assets) {
            const vol = asset.inflow.amount_in_usd + asset.outflow.amount_in_usd;
            if (!top || vol > topVol) {
                top = asset;
                topVol = vol;
            }
        }
        return top ? { asset: top, vol: topVol } : null;
    }, [assets]);

    return (
        <div className="flex flex-col gap-2.5">
            <span className="text-[12.5px] text-primary-text-tertiary">
                <span>Total volume </span>
                <span className="font-semibold tabular-nums text-primary-text">
                    {fmtUsd(totalVol)}
                </span>
            </span>
            <div className="flex flex-wrap gap-3">
                <div className={`${CARD_CLASS} flex-[1.4_1_236px]`}>
                    <span className="flex items-center gap-2 text-[12.5px] text-secondary-text">
                        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: FLOW_COLORS.inflow }} />
                        Inflow
                    </span>
                    <span className="text-[27px] font-semibold leading-[1.05] tracking-[-0.025em] tabular-nums text-primary-text">
                        {fmtUsd(totalIn)}
                    </span>
                    <span className="truncate text-[11.5px] tabular-nums text-primary-text-tertiary">
                        {`${nfmt(txIn)} transfers in · ${inPct.toFixed(0)}% of volume`}
                    </span>
                </div>
                <div className={`${CARD_CLASS} flex-[1.4_1_236px]`}>
                    <span className="flex items-center gap-2 text-[12.5px] text-secondary-text">
                        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: FLOW_COLORS.outflow }} />
                        Outflow
                    </span>
                    <span className="text-[27px] font-semibold leading-[1.05] tracking-[-0.025em] tabular-nums text-primary-text">
                        {fmtUsd(totalOut)}
                    </span>
                    <span className="truncate text-[11.5px] tabular-nums text-primary-text-tertiary">
                        {`${nfmt(txOut)} transfers out · ${outPct.toFixed(0)}% of volume`}
                    </span>
                </div>
                <div className={`${CARD_CLASS} flex-[1_1_168px]`}>
                    <span className="text-[12.5px] text-secondary-text">Total transfers</span>
                    <span className="text-2xl font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums text-primary-text">
                        {nfmt(txTotal)}
                    </span>
                    <span className="truncate text-[11.5px] tabular-nums text-primary-text-tertiary">
                        {`${fmtUsd(avgSize)} avg transfer`}
                    </span>
                </div>
                <div className={`${CARD_CLASS} flex-[1_1_168px]`}>
                    <span className="text-[12.5px] text-secondary-text">Top asset</span>
                    <span className="flex min-w-0 items-center gap-[9px]">
                        {topAsset?.asset.logo ? (
                            <Image src={topAsset.asset.logo} alt="" width={26} height={26} decoding="async" className="shrink-0 rounded-full" />
                        ) : (
                            <span className="h-[26px] w-[26px] shrink-0 rounded-full bg-secondary-300" />
                        )}
                        <span className="truncate text-[21px] font-semibold leading-[1.05] tracking-[-0.02em] text-primary-text">
                            {topAsset ? topAsset.asset.asset : "—"}
                        </span>
                    </span>
                    <span className="truncate text-[11.5px] tabular-nums text-primary-text-tertiary">
                        {topAsset ? `${fmtUsd(topAsset.vol)} · ${pct(topAsset.vol / (totalVol || 1))}` : "No transfers"}
                    </span>
                </div>
            </div>
        </div>
    );
}
