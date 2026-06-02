import { FC, useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
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

    return (
        <Popover open={open} onOpenChange={triggerDisabled ? undefined : setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={triggerDisabled && !selected}
                    className={clsx(
                        "flex items-center justify-between gap-2 w-full bg-secondary-500 rounded-2xl transition-colors border border-transparent px-4 py-3",
                        triggerDisabled
                            ? "cursor-default"
                            : "hover:bg-secondary-400/70 hover:border-secondary-400 focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none",
                    )}
                >
                    <span className="flex items-center gap-3 min-w-0">
                        <DestinationBadge token={selected?.token} network={selected?.network} />
                        <span className="flex flex-col min-w-0 text-left">
                            <span className="text-secondary-text text-[11px] uppercase tracking-wider">
                                You receive
                            </span>
                            {selected ? (
                                <span className="text-primary-text text-base font-semibold truncate">
                                    {selected.token.symbol}
                                    <span className="text-secondary-text font-normal text-sm">
                                        {" "}on {selected.network.display_name}
                                    </span>
                                </span>
                            ) : (
                                <span className="text-secondary-text text-sm">Select destination token</span>
                            )}
                        </span>
                    </span>
                    {!triggerDisabled && (
                        <ChevronDown
                            className={clsx(
                                "h-4 w-4 text-secondary-text shrink-0 transition-transform",
                                { "rotate-180": open },
                            )}
                            aria-hidden="true"
                        />
                    )}
                </button>
            </PopoverTrigger>
            {!triggerDisabled && (
                <PopoverContent
                    align="start"
                    sideOffset={6}
                    className="p-1 bg-secondary-500! rounded-xl max-h-80 overflow-y-auto max-w-none! w-full"
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
                                        "flex items-center justify-between gap-2 w-full px-2 py-2 rounded-lg text-left transition-colors",
                                        "hover:bg-secondary-400/70",
                                        { "bg-secondary-400/40": isSelected },
                                    )}
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span className="relative inline-flex shrink-0 h-7 w-7">
                                            <ImageWithFallback
                                                src={r.token.logo}
                                                alt={`${r.token.symbol} logo`}
                                                height="24"
                                                width="24"
                                                loading="eager"
                                                fetchPriority="high"
                                                className="h-6 w-6 rounded-full object-contain"
                                            />
                                            <span className="absolute left-[13px] top-3.5 h-4 w-4 rounded border border-secondary-500 bg-secondary-400 overflow-hidden">
                                                <ImageWithFallback
                                                    src={r.network.logo}
                                                    alt={r.network.display_name}
                                                    height="14"
                                                    width="14"
                                                    loading="eager"
                                                    fetchPriority="high"
                                                    className="object-contain"
                                                />
                                            </span>
                                        </span>
                                        <span className="text-primary-text text-base font-medium truncate">{r.token.symbol}</span>
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

const DestinationBadge: FC<{ token?: NetworkRouteToken; network?: NetworkRoute }> = ({ token, network }) => (
    <div className="inline-flex items-center relative shrink-0 h-10 w-10">
        <div className="h-6 w-6">
            <ImageWithFallback
                src={token?.logo}
                alt="Token Logo"
                height="36"
                width="36"
                loading="eager"
                fetchPriority="high"
                className="rounded-full object-contain"
            />
        </div>
        <div className="absolute left-[16px] top-3.5 h-4 w-4 rounded border border-secondary-500 bg-secondary-400 overflow-hidden">
            <ImageWithFallback
                src={network?.logo}
                alt="Network Logo"
                height="14"
                width="14"
                loading="eager"
                fetchPriority="high"
                className="object-contain"
            />
        </div>
    </div>
);

export default DestinationTokenPicker;
