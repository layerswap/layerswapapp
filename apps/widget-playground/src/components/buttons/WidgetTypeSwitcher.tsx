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
        <div className="px-5 pt-2 pb-4">
            <div className="flex items-center bg-secondary-700 rounded-xl p-1 gap-1">
                {options.map((opt) => {
                    const isActive = widgetType === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateWidgetType(opt.value)}
                            className={clsx(
                                "flex-1 rounded-lg text-base py-2 transition-colors duration-200 cursor-pointer",
                                isActive
                                    ? "bg-secondary-300 text-primary-text"
                                    : "bg-transparent text-secondary-text hover:bg-secondary-600"
                            )}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
