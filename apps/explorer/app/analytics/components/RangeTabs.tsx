"use client";

import { ANALYTICS_PERIODS, AnalyticsPeriod } from "@/models/Analytics";

const LABELS: Record<AnalyticsPeriod, string> = {
    "24h": "24H",
    "7d": "7D",
    "30d": "30D",
    "90d": "90D",
};

export default function RangeTabs({
    value,
    onChange,
    disabled,
}: {
    value: AnalyticsPeriod;
    onChange: (p: AnalyticsPeriod) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center gap-1 bg-[#171f31] border border-[#283247] rounded-[13px] p-1">
            {ANALYTICS_PERIODS.map((p) => {
                const active = p === value;
                return (
                    <button
                        key={p}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(p)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-[9px] text-[13px] font-semibold tabular-nums transition-colors disabled:opacity-60 ${active
                            ? "bg-[#0e1524] text-[#e1e3e6]"
                            : "text-[#a3adc2] hover:text-[#e1e3e6]"
                            }`}
                    >
                        {LABELS[p]}
                    </button>
                );
            })}
        </div>
    );
}
