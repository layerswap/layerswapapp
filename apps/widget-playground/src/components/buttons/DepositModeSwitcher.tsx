"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import type { DepositMode } from "@layerswap/widget";
import clsx from "clsx";

const modes: { value: DepositMode; label: string }[] = [
    { value: "inline", label: "Inline" },
    { value: "button", label: "Button" },
];

export function DepositModeSwitcher() {
    const { depositProps, updateDepositProp } = useWidgetContext();
    const current = depositProps.mode ?? "inline";

    return (
        <div className="bg-secondary-700 hover:brightness-110 transition-colors duration-200 rounded-xl p-2">
            <div className="flex items-center justify-between gap-2 px-2 h-12">
                <label className="text-lg text-primary-text">Mode</label>
                <div className="flex items-center bg-secondary-500 rounded-lg p-1 gap-1">
                    {modes.map((m) => {
                        const active = current === m.value;
                        return (
                            <button
                                key={m.value}
                                type="button"
                                onClick={() => updateDepositProp("mode", m.value)}
                                className={clsx(
                                    "rounded-md px-4 py-1.5 text-base transition-colors duration-200 cursor-pointer",
                                    active
                                        ? "bg-secondary-300 text-primary-text"
                                        : "bg-transparent text-secondary-text hover:bg-secondary-400"
                                )}
                            >
                                {m.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
