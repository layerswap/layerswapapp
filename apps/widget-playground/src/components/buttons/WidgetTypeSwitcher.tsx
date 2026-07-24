"use client";
import { useWidgetContext, type WidgetType } from "@/context/ConfigContext";
import clsx from "clsx";

const options: { value: WidgetType; label: string }[] = [
    { value: "swap", label: "Swap" },
    { value: "deposit", label: "Deposit" },
];

export function WidgetTypeSwitcher() {
    const { widgetType, updateWidgetType } = useWidgetContext();

    return (
        <div className="bg-secondary-700 hover:brightness-110 transition-colors duration-200 rounded-xl p-2">
            <div className="flex items-center justify-between gap-2 px-2 h-12">
                <label className="text-lg text-primary-text">Widget</label>
                <div className="flex items-center bg-secondary-500 rounded-lg p-1 gap-1">
                    {options.map((opt) => {
                        const isActive = widgetType === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateWidgetType(opt.value)}
                                className={clsx(
                                    "rounded-md px-4 py-1.5 text-base transition-colors duration-200 cursor-pointer",
                                    isActive
                                        ? "bg-secondary-300 text-primary-text"
                                        : "bg-transparent text-secondary-text hover:bg-secondary-400"
                                )}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
