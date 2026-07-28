"use client";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useWidgetContext } from "@/context/ConfigContext";
import { useSettingsState } from "@/context/settings";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import IconDelete from "@/public/icons/Delete";

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

export function DepositDestinationsButton() {
    const { depositProps, updateDepositProp } = useWidgetContext();
    const { destinationRoutes } = useSettingsState();

    const network = depositProps.destination?.network ?? "";
    const tokens = depositProps.destination?.tokens ?? [];

    const selectedNetwork = useMemo(
        () => destinationRoutes.find((n) => n.name === network),
        [destinationRoutes, network]
    );
    const networkTokens = selectedNetwork?.tokens ?? [];

    const canAddToken = networkTokens.some((t) => !tokens.includes(t.symbol));

    const handleNetworkChange = (newNetwork: string) => {
        const next = destinationRoutes.find((n) => n.name === newNetwork);
        const stillValid = tokens.filter((s) => next?.tokens?.some((t) => t.symbol === s));
        const nextTokens = stillValid.length > 0
            ? stillValid
            : next?.tokens?.[0]?.symbol ? [next.tokens[0].symbol] : [];
        updateDepositProp("destination", { network: newNetwork, tokens: nextTokens });
    };

    const handleTokenChange = (index: number, symbol: string) => {
        updateDepositProp("destination", {
            network,
            tokens: tokens.map((s, i) => (i === index ? symbol : s)),
        });
    };

    const handleAddToken = () => {
        const next = networkTokens.find((t) => !tokens.includes(t.symbol));
        if (!next) return;
        updateDepositProp("destination", { network, tokens: [...tokens, next.symbol] });
    };

    const handleRemoveToken = (index: number) => {
        updateDepositProp("destination", { network, tokens: tokens.filter((_, i) => i !== index) });
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

            <div className="flex flex-col gap-1">
                <label className="text-sm text-secondary-text">Network</label>
                <Select value={network} onValueChange={handleNetworkChange}>
                    <SelectTrigger className="w-full border-none bg-secondary-500 hover:bg-secondary-400 transition-colors h-11">
                        {selectedNetwork ? renderNetworkOption(selectedNetwork as any) : <SelectValue placeholder="Select network" />}
                    </SelectTrigger>
                    <SelectContent className="max-h-[420px] overflow-y-auto bg-secondary-500">
                        <SelectGroup>
                            {destinationRoutes.map((n) => (
                                <SelectItem key={n.name} value={n.name}>
                                    {renderNetworkOption(n as any)}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-3">
                <label className="text-sm text-secondary-text">Allowed tokens</label>
                {tokens.map((symbol, i) => {
                    const selectedToken = networkTokens.find((t) => t.symbol === symbol);
                    const availableTokens = networkTokens.filter((t) => t.symbol === symbol || !tokens.includes(t.symbol));
                    return (
                        <div key={`${symbol}-${i}`} className="flex gap-2 items-center">
                            <Select
                                value={symbol}
                                onValueChange={(t) => handleTokenChange(i, t)}
                                disabled={!selectedNetwork}
                            >
                                <SelectTrigger className="flex-1 w-full border-none bg-secondary-500 hover:bg-secondary-400 transition-colors h-11">
                                    {selectedToken
                                        ? renderTokenOption(selectedToken as any)
                                        : <SelectValue placeholder={selectedNetwork ? "Select token" : "Pick a network first"} />}
                                </SelectTrigger>
                                <SelectContent className="max-h-[420px] overflow-y-auto bg-secondary-500">
                                    <SelectGroup>
                                        {availableTokens.map((t) => (
                                            <SelectItem key={t.symbol} value={t.symbol}>
                                                {renderTokenOption(t as any)}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <button
                                type="button"
                                onClick={() => handleRemoveToken(i)}
                                disabled={tokens.length <= 1}
                                title="Remove"
                                className="shrink-0 w-11 h-11 rounded-xl bg-secondary-700 hover:bg-secondary-600 cursor-pointer flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <IconDelete className="w-6 h-6" />
                            </button>
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={handleAddToken}
                    disabled={!canAddToken}
                    className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-secondary hover:bg-secondary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Plus className="h-5 w-5" />
                    <span className="text-base leading-6">Add token</span>
                </button>
            </div>
        </div>
    );
}

export const DepositDestinationsButtonTrigger = () => (
    <div className="flex justify-between w-full">
        <label>Destination</label>
    </div>
);
