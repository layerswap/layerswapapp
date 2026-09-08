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
        <div
            className="flex w-full items-center gap-1 rounded-[13px] border border-secondary-300 bg-secondary-500 p-1 sm:w-auto"
            role="group"
            aria-label="Analytics period"
        >
            {ANALYTICS_PERIODS.map((p) => {
                const active = p === value;
                return (
                    <button
                        key={p}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(p)}
                        aria-pressed={active}
                        className={`flex-1 rounded-[9px] px-3 py-1.5 text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 disabled:opacity-60 sm:flex-none ${active
                            ? "bg-secondary-700 text-primary-text"
                            : "text-secondary-text hover:text-primary-text"
                            }`}
                    >
                        {LABELS[p]}
                    </button>
                );
            })}
        </div>
    );
}
