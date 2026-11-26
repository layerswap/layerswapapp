import { FC, useDeferredValue, useMemo, useState } from "react";
import { NetworkRoute } from "@layerswap/widget-types";
import { groupRoutes } from "@/hooks/useFormRoutes";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useRouteSortingStore } from "@/stores/routeSortingStore";
import { useSwapRouteRecency } from "@/stores/swapRouteHistoryStore";
import { Content, ContentProps } from "./Content";

type Props = Omit<ContentProps, "searchQuery" | "setSearchQuery" | "resultsQuery" | "rowElements"> & {
    routes: NetworkRoute[];
};

/** Token-grouped route list without balances or suggestions; builds its rows only while mounted. */
export const TokenGroupedContent: FC<Props> = ({ routes, ...contentProps }) => {
    const { direction } = contentProps;
    const [searchQuery, setSearchQuery] = useState("");
    const resultsQuery = useDeferredValue(searchQuery);
    const sortingOption = useRouteSortingStore((s) => s.sortingOption);
    const routesHistory = useRecentNetworksStore((state) => state.recentRoutes);
    const swapRecency = useSwapRouteRecency();

    const rowElements = useMemo(() => groupRoutes({
        routes,
        direction,
        balances: null,
        groupBy: "token",
        recents: routesHistory,
        swapRecency,
        balancesLoaded: false,
        search: resultsQuery,
        sortingOption,
        skipBalanceGate: true,
        hideSuggestions: true,
    }), [routes, direction, routesHistory, swapRecency, resultsQuery, sortingOption]);

    return (
        <Content
            {...contentProps}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            resultsQuery={resultsQuery}
            rowElements={rowElements}
        />
    );
};
