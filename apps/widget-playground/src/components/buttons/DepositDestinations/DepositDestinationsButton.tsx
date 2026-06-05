"use client";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useWidgetContext } from "@/context/ConfigContext";
import { useSettingsState } from "@/context/settings";
import { Input } from "@/components/ui/input";
import { DestinationRow } from "./DestinationRow";

export function DepositDestinationsButton() {
    const { depositProps, updateDepositProp, updateDepositProps } = useWidgetContext();
    const { destinationRoutes } = useSettingsState();

    const destinations = depositProps.destinations ?? [];

    const usedNetworks = useMemo(() => destinations.map((d) => d.network), [destinations]);

    const canAdd = destinationRoutes.some((n) => !usedNetworks.includes(n.name));

    const handleAdd = () => {
        const next = destinationRoutes.find((n) => !usedNetworks.includes(n.name));
        if (!next) return;
        const firstToken = next.tokens?.[0]?.symbol ?? "";
        updateDepositProps((prev) => ({
            ...prev,
            destinations: [...(prev.destinations ?? []), { network: next.name, token: firstToken }],
        }));
    };

    const handleChange = (index: number, network: string, token: string) => {
        updateDepositProps((prev) => {
            const current = prev.destinations ?? [];
            const nextList = current.map((d, i) => (i === index ? { network, token } : d));
            return { ...prev, destinations: nextList };
        });
    };

    const handleRemove = (index: number) => {
        updateDepositProps((prev) => {
            const current = prev.destinations ?? [];
            return { ...prev, destinations: current.filter((_, i) => i !== index) };
        });
    };

    return (
        <div className="flex flex-col gap-4 px-2 pb-1">
            <div className="flex flex-col gap-1">
                <label className="text-sm text-secondary-text">Destination address</label>
                <Input
                    value={depositProps.destinationAddress ?? ""}
                    onChange={(e) => updateDepositProp("destinationAddress", e.target.value)}
                    placeholder="0x..."
                    className="bg-secondary-500 rounded-xl h-11"
                />
            </div>

            <div className="flex flex-col gap-3">
                <label className="text-sm text-secondary-text">Allowed destinations</label>
                {destinations.map((d, i) => (
                    <DestinationRow
                        key={`${d.network}-${i}`}
                        network={d.network}
                        token={d.token}
                        usedNetworks={usedNetworks}
                        onChange={(network, token) => handleChange(i, network, token)}
                        onRemove={() => handleRemove(i)}
                    />
                ))}
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!canAdd}
                    className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-secondary hover:bg-secondary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Plus className="h-5 w-5" />
                    <span className="text-base leading-6">Add destination</span>
                </button>
            </div>
        </div>
    );
}

export const DepositDestinationsButtonTrigger = () => (
    <div className="flex justify-between w-full">
        <label>Destinations</label>
    </div>
);
