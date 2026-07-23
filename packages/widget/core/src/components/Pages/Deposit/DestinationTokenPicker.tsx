import { FC, useMemo, useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import TokenChainBadge from "./_shared/TokenChainBadge";
import PickerTriggerContent from "./_shared/PickerTriggerContent";
import { useSettingsState } from "@/context/settings";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useDepositSelection } from "./depositSelectionContext";

export type SupportedDestination = {
    /** Network `name` (canonical identifier like `BASE_MAINNET`). */
    network: string;
    /** Token symbols (case-insensitive, e.g. `["USDC", "USDT"]`). The user picks
     * one of these via the token dropdown; the network is fixed. */
    tokens: string[];
};

export type ResolvedDestination = {
    network: NetworkRoute;
    token: NetworkRouteToken;
};

/**
 * Resolves the integrator-provided destination (a single network plus its
 * allowed token symbols) into the full `NetworkRoute` + `NetworkRouteToken`
 * objects from settings, one entry per token. Tokens that don't match an
 * active token in settings are dropped.
 */
export function useResolvedDestinations(destination: SupportedDestination): ResolvedDestination[] {
    const settings = useSettingsState();
    return useMemo(() => {
        const routes = settings.destinationRoutes ?? [];
        const network = routes.find(r => r.name.toLowerCase() === destination.network.toLowerCase());
        if (!network) return [];
        const out: ResolvedDestination[] = [];
        for (const symbol of destination.tokens) {
            const token = network.tokens?.find(
                t => t.symbol.toUpperCase() === symbol.toUpperCase() && t.status === "active",
            );
            if (!token) continue;
            out.push({ network, token });
        }
        return out;
    }, [settings.destinationRoutes, destination]);
}

const DestinationTokenPicker: FC = () => {
    const { resolved, destination, destinationToken, setSelection } = useDepositSelection();
    const [open, setOpen] = useState(false);

    const selected = useMemo(() => {
        if (!destination || !destinationToken) return undefined;
        return resolved.find(
            r => r.network.name === destination.name && r.token.symbol === destinationToken.symbol,
        );
    }, [resolved, destination, destinationToken]);

    const handleSelect = (r: ResolvedDestination) => {
        setSelection(r.network, r.token);
        setOpen(false);
    };

    const triggerDisabled = resolved.length <= 1;

    // With a single (or no) supported destination there is nothing to pick —
    // the destination is already pre-populated via the effect above and the
    // initial form values, so hide the picker entirely.
    if (triggerDisabled) return null;

    return (
        <Popover open={open} onOpenChange={triggerDisabled ? undefined : setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={triggerDisabled && !selected}
                    className={clsx(
                        "w-full bg-secondary-500 rounded-2xl transition-colors border border-transparent px-4 py-3",
                        triggerDisabled
                            ? "cursor-default"
                            : "hover:bg-secondary-400/70 hover:border-secondary-400 focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none",
                    )}
                >
                    <PickerTriggerContent
                        label="You receive"
                        token={selected?.token}
                        network={selected?.network}
                        placeholder="Select destination token"
                        showChevron={!triggerDisabled}
                        chevronOpen={open}
                    />
                </button>
            </PopoverTrigger>
            {!triggerDisabled && (
                <PopoverContent
                    align="start"
                    sideOffset={6}
                    style={{ zIndex: 70 }}
                    className="p-1 bg-secondary-500! rounded-xl max-h-80 overflow-y-auto max-w-none! w-[var(--radix-popover-trigger-width)]!"
                >
                    <div className="flex flex-col gap-0.5">
                        {resolved.map((r) => {
                            const isSelected = selected?.network.name === r.network.name && selected.token.symbol === r.token.symbol;
                            return (
                                <button
                                    key={`${r.network.name}:${r.token.symbol}`}
                                    type="button"
                                    onClick={() => handleSelect(r)}
                                    className={clsx(
                                        "flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                                        "hover:bg-secondary-400/70",
                                        isSelected ? "bg-secondary-400/60" : "bg-transparent",
                                    )}
                                >
                                    <span className="flex items-center gap-3 min-w-0">
                                        <TokenChainBadge
                                            tokenLogo={r.token.logo}
                                            tokenSymbol={r.token.symbol}
                                            networkLogo={r.network.logo}
                                            networkName={r.network.display_name}
                                            size={32}
                                        />
                                        <span className="flex flex-col min-w-0 text-left leading-tight">
                                            <span className="text-primary-text text-base font-semibold truncate">{r.token.symbol}</span>
                                            <span className="text-secondary-text text-sm truncate">{r.network.display_name}</span>
                                        </span>
                                    </span>
                                    {isSelected && <Check className="h-4 w-4 text-primary-text shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </PopoverContent>
            )}
        </Popover>
    );
};

export default DestinationTokenPicker;
