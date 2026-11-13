import { useMemo } from "react";
import { NetworkBalance, NetworkRoute } from "@layerswap/widget-types";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";
import { extractTokenElementsAsSuggested, getTokenElementBalanceAmount, sortSuggestedTokenElements } from "@/helpers/routeUtils";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useSwapRouteRecency } from "@/stores/swapRouteHistoryStore";

/** Active route tokens flattened and ranked like the picker's suggested list. */
export default function useSortedTokenElements(
    routes: NetworkRoute[],
    balances: Record<string, NetworkBalance> | null,
    direction: SwapDirection,
    onlyWithBalance?: boolean,
) {
    const recentRoutes = useRecentNetworksStore(s => s.recentRoutes);
    const swapRecency = useSwapRouteRecency();

    return useMemo(() => {
        const flattened = extractTokenElementsAsSuggested(routes).filter(
            e => e.route.token.status === "active"
        );
        const sorted = flattened.sort(sortSuggestedTokenElements(direction, balances, recentRoutes, swapRecency));
        if (onlyWithBalance) {
            return sorted.filter(e => getTokenElementBalanceAmount(e, balances) > 0);
        }
        return sorted;
    }, [routes, balances, direction, recentRoutes, swapRecency, onlyWithBalance]);
}
