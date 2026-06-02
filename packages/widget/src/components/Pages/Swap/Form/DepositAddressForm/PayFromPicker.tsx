import { FC, useMemo, useState } from "react";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import useWallet from "@/hooks/useWallet";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { Content } from "@/components/Input/RoutePicker/Content";
import PickerTriggerContent from "@/components/Pages/Deposit/_shared/PickerTriggerContent";
import { groupRoutes } from "@/hooks/useFormRoutes";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useRouteSortingStore } from "@/stores/routeSortingStore";
import useSuggestionsLimit from "@/hooks/useSuggestionsLimit";
import useDepositAddressAvailableRoutes from "@/hooks/useDepositAddressAvailableRoutes";

type PayFromPickerProps = {
    selectedSource: { network: NetworkRoute; token: NetworkRouteToken } | null;
    onSourceChange: (network: NetworkRoute, token: NetworkRouteToken) => void;
    destinationNetwork: string | undefined;
    destinationToken: string | undefined;
}

const PayFromPicker: FC<PayFromPickerProps> = ({ selectedSource, onSourceChange, destinationNetwork, destinationToken }) => {
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

    const hasOptions = availableRoutes.length > 0;
    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);

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
        <Selector>
            <SelectorTrigger
                disabled={!hasOptions || !hasMultipleOptions}
                className="group w-full bg-secondary-500 hover:bg-secondary-400/70 disabled:hover:bg-secondary-500 border border-transparent rounded-2xl !px-4 !py-3 transition-colors disabled:cursor-not-allowed"
            >
                <PickerTriggerContent
                    label="You send"
                    token={selectedSource?.token}
                    network={selectedSource?.network}
                    placeholder="Select source"
                    accessory={
                        isMostUsed ? (
                            <span className="inline-flex items-center bg-secondary-300 text-secondary-text text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">
                                <span>Most used</span>
                            </span>
                        ) : null
                    }
                />
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
                    />
                )}
            </SelectorContent>
        </Selector>
    );
};

export default PayFromPicker;
