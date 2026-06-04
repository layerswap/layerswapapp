import { FC, useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Check } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import TokenChainBadge from "./_shared/TokenChainBadge";
import PickerTriggerContent from "./_shared/PickerTriggerContent";
import { useSettingsState } from "@/context/settings";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";

export type SupportedDestination = {
    /** Network `name` (canonical identifier like `BASE_MAINNET`). */
    network: string;
    /** Token symbol (case-insensitive, e.g. `USDC`). */
    token: string;
};

export type ResolvedDestination = {
    network: NetworkRoute;
    token: NetworkRouteToken;
};

/**
 * Resolves integrator-provided `{network, token}` pairs into the full
 * `NetworkRoute` + `NetworkRouteToken` objects from settings. Pairs that
 * don't match an active token in settings are dropped.
 */
export function useResolvedDestinations(destinations: SupportedDestination[]): ResolvedDestination[] {
    const settings = useSettingsState();
    return useMemo(() => {
        const routes = settings.destinationRoutes ?? [];
        const out: ResolvedDestination[] = [];
        for (const d of destinations) {
            const network = routes.find(r => r.name.toLowerCase() === d.network.toLowerCase());
            if (!network) continue;
            const token = network.tokens?.find(
                t => t.symbol.toUpperCase() === d.token.toUpperCase() && t.status === "active",
            );
            if (!token) continue;
            out.push({ network, token });
        }
        return out;
    }, [settings.destinationRoutes, destinations]);
}

type Props = {
    destinations: SupportedDestination[];
};

const DestinationTokenPicker: FC<Props> = ({ destinations }) => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const resolved = useResolvedDestinations(destinations);
    const [open, setOpen] = useState(false);

    const selected = useMemo(() => {
        if (!values?.to || !values?.toAsset) return undefined;
        return resolved.find(
            r => r.network.name === values.to?.name && r.token.symbol === values.toAsset?.symbol,
        );
    }, [resolved, values?.to, values?.toAsset]);

    // Pre-populate with the first supported destination when nothing is set
    // yet, or when the current selection isn't in the supported list (e.g. the
    // integrator changed their list at runtime).
    useEffect(() => {
        if (resolved.length === 0) return;
        if (selected) return;
        const next = resolved[0];
        setFieldValue("to", next.network, false);
        setFieldValue("toAsset", next.token, true);
    }, [resolved, selected, setFieldValue]);

    const handleSelect = (r: ResolvedDestination) => {
        setFieldValue("to", r.network, false);
        setFieldValue("toAsset", r.token, true);
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
