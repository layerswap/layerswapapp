import { FC, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { Content } from "@/components/Input/RoutePicker/Content";
import { groupRoutes } from "@/hooks/useFormRoutes";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useRouteSortingStore } from "@/stores/routeSortingStore";
import PickerTriggerContent from "@/components/Pages/Deposit/_shared/PickerTriggerContent";
import useDepositAddressAvailableRoutes from "@/hooks/useDepositAddressAvailableRoutes";

type PayFromPickerProps = {
    selectedSource: { network: NetworkRoute; token: NetworkRouteToken } | null;
    onSourceChange: (network: NetworkRoute, token: NetworkRouteToken) => void;
    destinationNetwork: string | undefined;
    destinationToken: string | undefined;
}

const PayFromPicker: FC<PayFromPickerProps> = ({ selectedSource, onSourceChange, destinationNetwork, destinationToken }) => {
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
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes);
    const sortingOption = useRouteSortingStore((s) => s.sortingOption);

    const routeElements = useMemo(() => {
        return groupRoutes({
            routes: availableRoutes,
            direction: 'from',
            balances: null,
            groupBy: 'token',
            recents: routesHistory,
            balancesLoaded: false,
            search: searchQuery,
            sortingOption,
            skipBalanceGate: true,
            hideSuggestions: true,
        });
    }, [availableRoutes, searchQuery, routesHistory, sortingOption]);

    const hasOptions = availableRoutes.length > 0;
    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);
    const triggerDisabled = !hasOptions || !hasMultipleOptions;

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
                    />
                </button>
            </PopoverTrigger>
            {!triggerDisabled && (
                <PopoverContent
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    container={portalContainer}
                    className="p-2 bg-secondary-600! text-primary-text rounded-xl max-w-none! w-[var(--radix-popover-trigger-width)]! flex flex-col h-[340px] max-h-[var(--radix-popover-content-available-height)] overflow-hidden"
                >
                    <Content
                        onSelect={(r, t) => { onSourceChange(r, t); setOpen(false); }}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        rowElements={routeElements}
                        direction="from"
                        selectedRoute={selectedSource?.network.name}
                        selectedToken={selectedSource?.token.symbol}
                        hideTokenSwitch
                        hideBalances
                    />
                </PopoverContent>
            )}
        </Popover>
    );
};

export default PayFromPicker;
