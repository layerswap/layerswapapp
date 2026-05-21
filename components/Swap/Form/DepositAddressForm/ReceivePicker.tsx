import { FC, useMemo, useState } from "react";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import useWallet from "@/hooks/useWallet";
import useDepositAddressDestinations from "@/hooks/useDepositAddressDestinations";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { SelectedRouteDisplay } from "@/components/Input/RoutePicker/Routes";
import { Content } from "@/components/Input/RoutePicker/Content";
import { groupRoutes } from "@/hooks/useFormRoutes";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useRouteSortingStore } from "@/stores/routeSortingStore";
import useSuggestionsLimit from "@/hooks/useSuggestionsLimit";
import DestinationWalletPicker from "./DestinationWalletPicker";

type ReceivePickerProps = {
    selectedDestination: { network: NetworkRoute; token: NetworkRouteToken } | null;
    onDestinationChange: (network: NetworkRoute, token: NetworkRouteToken) => void;
    destinationAddress: string | undefined;
    destination: NetworkRoute | undefined;
}

const ReceivePicker: FC<ReceivePickerProps> = ({
    selectedDestination,
    onDestinationChange,
    destinationAddress,
    destination,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { wallets } = useWallet();
    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0 });
    const sortingOption = useRouteSortingStore((s) => s.sortingOption);
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes);

    const { data: destinationRoutesData } = useDepositAddressDestinations();

    const availableRoutes = useMemo(() => {
        const routes = destinationRoutesData?.data;
        if (!routes) return [];
        return routes
            .map(route => ({ ...route, tokens: route.tokens?.filter(t => t.status === 'active') ?? [] }))
            .filter(route => route.tokens.length > 0);
    }, [destinationRoutesData]);

    const routeElements = useMemo(() => {
        return groupRoutes({
            routes: availableRoutes,
            direction: 'to',
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

    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);

    return (
        <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-secondary-text tracking-wide">Receive</span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <Selector>
                        <SelectorTrigger disabled={!hasMultipleOptions} className="bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-3.5 py-3 transition-colors">
                            <SelectedRouteDisplay
                                route={selectedDestination?.network}
                                token={selectedDestination?.token}
                                placeholder="Select destination"
                            />
                        </SelectorTrigger>
                        <SelectorContent isLoading={false}>
                            {({ closeModal }) => (
                                <Content
                                    onSelect={(r, t) => { onDestinationChange(r, t); closeModal(); }}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    rowElements={routeElements}
                                    direction="to"
                                    selectedRoute={selectedDestination?.network.name}
                                    selectedToken={selectedDestination?.token.symbol}
                                    hideTokenSwitch
                                    hideBalances
                                />
                            )}
                        </SelectorContent>
                    </Selector>
                </div>
                <div className="flex-1 min-w-0">
                    <DestinationWalletPicker
                        address={destinationAddress}
                        destination={destination}
                        token={selectedDestination?.token}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReceivePicker;
