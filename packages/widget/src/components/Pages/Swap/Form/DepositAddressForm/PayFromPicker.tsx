import { FC, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { FlatContent } from "@/components/Input/RoutePicker/FlatContent";
import { SearchComponent } from "@/components/Input/Search";
import PickerTriggerContent from "@/components/Pages/Deposit/_shared/PickerTriggerContent";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import useDepositAddressAvailableRoutes from "@/hooks/useDepositAddressAvailableRoutes";

type PayFromPickerProps = {
    selectedSource: { network: NetworkRoute; token: NetworkRouteToken } | null;
    onSourceChange: (network: NetworkRoute, token: NetworkRouteToken) => void;
    destinationNetwork: string | undefined;
    destinationToken: string | undefined;
}

const PayFromPicker: FC<PayFromPickerProps> = ({ selectedSource, onSourceChange, destinationNetwork, destinationToken }) => {
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes);
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // Portal into the widget root so the popover lives inside any wrapping
    // Radix Dialog. Otherwise Dialog's body-level scroll lock (pointer-events:
    // none on body) eats wheel events on the popover's scrollable list.
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setPortalContainer(document.getElementById("widget"));
    }, []);

    const { availableRoutes } = useDepositAddressAvailableRoutes(destinationNetwork, destinationToken);

    useEffect(() => {
        if (!open) setSearchQuery('');
    }, [open]);

    const filteredRoutes = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return availableRoutes;
        return availableRoutes
            .map(r => {
                const matched = (r.tokens ?? []).filter(t => {
                    const networkMatch = r.display_name.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
                    const tokenMatch = t.symbol.toLowerCase().includes(q) || t.display_asset?.toLowerCase().includes(q);
                    return networkMatch || tokenMatch;
                });
                return matched.length > 0 ? { ...r, tokens: matched } : null;
            })
            .filter((r): r is NetworkRoute => r !== null);
    }, [availableRoutes, searchQuery]);

    const hasOptions = availableRoutes.length > 0;
    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);
    const triggerDisabled = !hasOptions || !hasMultipleOptions;

    // "Most used" = the (network, token) pair with the highest count in the
    // user's source-route history. Shown only when the currently selected
    // source matches that pair. New users with no history don't see it.
    const mostUsedKey = useMemo(() => {
        const buckets = routesHistory?.sourceRoutes;
        if (!buckets) return null;
        let best: { network: string; token: string; count: number } | null = null;
        for (const [network, tokens] of Object.entries(buckets)) {
            for (const [token, count] of Object.entries(tokens)) {
                if (!best || count > best.count) {
                    best = { network, token, count };
                }
            }
        }
        return best;
    }, [routesHistory]);

    const isMostUsed = !!(
        selectedSource &&
        mostUsedKey &&
        mostUsedKey.network === selectedSource.network.name &&
        mostUsedKey.token === selectedSource.token.symbol
    );

    return (
        <Popover open={open} onOpenChange={triggerDisabled ? undefined : setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={triggerDisabled}
                    className={clsx(
                        "w-full bg-secondary-500 rounded-xl border border-transparent !px-4 !py-3 transition-colors",
                        triggerDisabled
                            ? "cursor-not-allowed"
                            : "hover:bg-secondary-400/70 hover:border-secondary-400 focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none",
                    )}
                >
                    <PickerTriggerContent
                        label="You send"
                        token={selectedSource?.token}
                        network={selectedSource?.network}
                        placeholder="Select source"
                        showChevron={!triggerDisabled}
                        chevronOpen={open}
                        accessory={
                            isMostUsed ? (
                                <span className="inline-flex items-center bg-secondary-300 text-secondary-text text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">
                                    <span>Most used</span>
                                </span>
                            ) : null
                        }
                    />
                </button>
            </PopoverTrigger>
            {!triggerDisabled && (
                <PopoverContent
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    container={portalContainer}
                    className="p-2 bg-secondary-600! rounded-xl max-w-none! w-[var(--radix-popover-trigger-width)]! flex flex-col h-[400px] max-h-[var(--radix-popover-content-available-height)] overflow-hidden"
                >
                    <SearchComponent
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        isOpen={open}
                        placeholder="Search by token or network"
                    />
                    <div className="flex-1 min-h-0">
                        <FlatContent
                            onSelect={(r, t) => { onSourceChange(r, t); setOpen(false); }}
                            routes={filteredRoutes}
                            balances={null}
                            balancesLoading={false}
                            direction="from"
                            selectedRoute={selectedSource?.network.name}
                            selectedToken={selectedSource?.token.symbol}
                            hideBalances
                        />
                    </div>
                </PopoverContent>
            )}
        </Popover>
    );
};

export default PayFromPicker;
