"use client";
import { useMemo } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsState } from "@/context/settings";
import IconDelete from "@/public/icons/Delete";

type DestinationRowProps = {
    network: string;
    token: string;
    usedNetworks: ReadonlyArray<string>;
    onChange: (network: string, token: string) => void;
    onRemove: () => void;
};

const renderNetworkOption = (net: { name: string; display_name?: string; logo?: string }) => (
    <div className="flex items-center gap-2">
        {net.logo && <img src={net.logo} alt={net.display_name ?? net.name} className="rounded-sm w-5 h-5" />}
        <span>{net.display_name ?? net.name}</span>
    </div>
);

const renderTokenOption = (tok: { symbol: string; logo?: string }) => (
    <div className="flex items-center gap-2">
        {tok.logo && <img src={tok.logo} alt={tok.symbol} className="rounded-sm w-5 h-5" />}
        <span>{tok.symbol}</span>
    </div>
);

export function DestinationRow({ network, token, usedNetworks, onChange, onRemove }: DestinationRowProps) {
    const { destinationRoutes } = useSettingsState();

    const availableNetworks = useMemo(
        () => destinationRoutes.filter((n) => n.name === network || !usedNetworks.includes(n.name)),
        [destinationRoutes, usedNetworks, network]
    );

    const selectedNetwork = useMemo(
        () => destinationRoutes.find((n) => n.name === network),
        [destinationRoutes, network]
    );

    const tokens = selectedNetwork?.tokens ?? [];

    const handleNetworkChange = (newNetwork: string) => {
        const next = destinationRoutes.find((n) => n.name === newNetwork);
        const firstToken = next?.tokens?.[0]?.symbol ?? "";
        const stillValid = next?.tokens?.some((t) => t.symbol === token);
        onChange(newNetwork, stillValid ? token : firstToken);
    };

    return (
        <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-1">
                <label className="text-sm text-secondary-text">Network</label>
                <Select value={network} onValueChange={handleNetworkChange}>
                    <SelectTrigger className="w-full border-none bg-secondary-500 hover:bg-secondary-400 transition-colors h-11">
                        {selectedNetwork ? renderNetworkOption(selectedNetwork as any) : <SelectValue placeholder="Select network" />}
                    </SelectTrigger>
                    <SelectContent className="max-h-[420px] overflow-y-auto bg-secondary-500">
                        <SelectGroup>
                            {availableNetworks.map((n) => (
                                <SelectItem key={n.name} value={n.name}>
                                    {renderNetworkOption(n as any)}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex-1 flex flex-col gap-1">
                <label className="text-sm text-secondary-text">Token</label>
                <Select
                    value={token}
                    onValueChange={(t) => onChange(network, t)}
                    disabled={!selectedNetwork}
                >
                    <SelectTrigger className="w-full border-none bg-secondary-500 hover:bg-secondary-400 transition-colors h-11">
                        {tokens.find((t) => t.symbol === token)
                            ? renderTokenOption(tokens.find((t) => t.symbol === token) as any)
                            : <SelectValue placeholder={selectedNetwork ? "Select token" : "Pick a network first"} />}
                    </SelectTrigger>
                    <SelectContent className="max-h-[420px] overflow-y-auto bg-secondary-500">
                        <SelectGroup>
                            {tokens.map((t) => (
                                <SelectItem key={t.symbol} value={t.symbol}>
                                    {renderTokenOption(t as any)}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <button
                type="button"
                onClick={onRemove}
                title="Remove"
                className="shrink-0 w-11 h-11 rounded-xl bg-secondary-700 hover:bg-secondary-600 cursor-pointer flex items-center justify-center transition-colors"
            >
                <IconDelete className="w-6 h-6" />
            </button>
        </div>
    );
}
