import { FC, useMemo, useState } from "react";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import useWallet from "@/hooks/useWallet";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { SelectedRouteDisplay } from "@/components/Input/RoutePicker/Routes";
import { Content } from "@/components/Input/RoutePicker/Content";
import { groupRoutes } from "@/hooks/useFormRoutes";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useRouteSortingStore } from "@/stores/routeSortingStore";
import useSuggestionsLimit from "@/hooks/useSuggestionsLimit";
import useDepositAddressAvailableRoutes from "@/hooks/useDepositAddressAvailableRoutes";
import PickerTriggerContent from "@/components/Pages/Deposit/_shared/PickerTriggerContent";

type PayFromPickerProps = {
    selectedSource: { network: NetworkRoute; token: NetworkRouteToken } | null;
    onSourceChange: (network: NetworkRoute, token: NetworkRouteToken) => void;
    destinationNetwork: string | undefined;
    destinationToken: string | undefined;
    hideDestinationPicker?: boolean;
}

const PayFromPicker: FC<PayFromPickerProps> = ({ selectedSource, onSourceChange, destinationNetwork, destinationToken, hideDestinationPicker }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { wallets } = useWallet();
    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0 });
    const sortingOption = useRouteSortingStore((s) => s.sortingOption);
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes);

    const { availableRoutes } = useDepositAddressAvailableRoutes(destinationNetwork, destinationToken);

    const routeElements = useMemo(() => {
        return groupRoutes({
            routes: availableRoutes,
            direction: 'from',
            balances: null,
            groupBy: 'token',
            recents: routesHistory,
            balancesLoaded: false,
            search: searchQuery,
            suggestionsLimit,
            sortingOption,
            skipBalanceGate: true,
            hideSuggestions: true,
        });
    }, [availableRoutes, searchQuery, routesHistory, suggestionsLimit, sortingOption]);

    // Disable until the destination resolves a non-empty source list.
    const hasOptions = availableRoutes.length > 0;
    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);

    return (
        <div className="flex items-center gap-2">
            {!hideDestinationPicker && <span className="w-24 shrink-0 text-sm text-secondary-text tracking-wide">Send</span>}
            <div className="flex-1 min-w-0">
                <Selector>
                    <SelectorTrigger disabled={!hasOptions || !hasMultipleOptions} className={`bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-4 py-3 transition-colors ${hideDestinationPicker ? "pr-4 rounded-2xl!" : ""}`}>
                        {
                            hideDestinationPicker
                                ? <PickerTriggerContent
                                    label="You send"
                                    token={selectedSource?.token}
                                    network={selectedSource?.network}
                                    placeholder="Select source"
                                    showChevron={hasMultipleOptions}
                                />
                                : <SelectedRouteDisplay
                                    route={selectedSource?.network}
                                    token={selectedSource?.token}
                                    placeholder="Select source"
                                />
                        }
                    </SelectorTrigger>
                    <SelectorContent isLoading={false}>
                        {({ closeModal }) => (
                            <Content
                                onSelect={(r, t) => { onSourceChange(r, t); closeModal(); }}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                rowElements={routeElements}
                                direction="from"
                                selectedRoute={selectedSource?.network.name}
                                selectedToken={selectedSource?.token.symbol}
                                hideTokenSwitch
                                hideBalances
                                hideConnectButton
                            />
                        )}
                    </SelectorContent>
                </Selector>
            </div>
        </div>
    );
};

export default PayFromPicker;
