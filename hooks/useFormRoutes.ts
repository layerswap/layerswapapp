
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { ApiResponse } from "../Models/ApiResponse";
import { NetworkRoute, NetworkRouteToken } from "../Models/Network";
import { useSettingsState } from "../context/settings";
import { NetworkElement, RowElement, NetworkTokenElement, TitleElement, GroupedTokenElement, TokenSceletonElement } from "../Models/Route";
import useAllWithdrawalBalances from "./useAllWithdrawalBalances";
import { NetworkBalance } from "../Models/Balance";
import { resolveExchangesURLForSelectedToken, resolveNetworkRoutesURL } from "../helpers/routes";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import { Exchange } from "@/Models/Exchange";
import useExchangeNetworks from "./useExchangeNetworks";
import { RoutesHistory, useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useRouteTokenSwitchStore } from "@/stores/routeTokenSwitchStore";

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
};

export default function useFormRoutes({ direction, values }: Props, search?: string) {
    const { routes, isLoading: routesLoading } = useRoutes({ direction, values });
    const { exchangesRoutes, isLoading: exchangesRoutesLoading } = useExchangeRoutes({ direction, values })
    const { networks: withdrawalNetworks, isLoading: exchangeSourceNetworksLoading } = useExchangeNetworks({
        fromExchange: values.fromExchange?.name,
        to: values.to?.name,
        toAsset: values.toAsset?.symbol
    });
    const groupByToken = useRouteTokenSwitchStore((s) => s.showTokens)
    const { balances, isLoading: balancesLoading } = useAllWithdrawalBalances();
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes)
    const routeElements = useMemo(() => groupRoutes(routes, direction, balances, groupByToken ? "token" : "network", routesHistory, balancesLoading, search), [balancesLoading, routes, balances, direction, search, groupByToken, routesHistory]);

    const exchanges = useMemo(() => {
        return groupExchanges(exchangesRoutes, search);
    }, [exchangesRoutes, search]);


    const selectedRoute = useMemo(() => resolveSelectedRoute(values, direction), [values, direction]);
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction]);

    return useMemo(() => ({
        allRoutes: routes,
        isLoading: routesLoading,
        routeElements,
        exchanges,
        exchangesRoutesLoading,
        exchangeNetworks: withdrawalNetworks,
        exchangeSourceNetworksLoading,
        selectedRoute,
        selectedToken,
        allbalancesLoaded: !balancesLoading,
    }), [
        routes,
        routesLoading,
        routeElements,
        exchanges,
        exchangesRoutesLoading,
        withdrawalNetworks,
        exchangeSourceNetworksLoading,
        selectedRoute,
        selectedToken,
        balancesLoading,
    ]);
}

function useRoutesData<T extends object>(url: string, defaultData: T[], fetcher: (url: string) => Promise<ApiResponse<T[]>>) {
    const { data, isLoading } = useSWR<ApiResponse<T[]>>(url, fetcher, {
        keepPreviousData: true,
        dedupingInterval: 10000,
    });

    const [routes, setRoutes] = useState<T[]>(defaultData);

    useEffect(() => {
        if (!isLoading && data?.data) setRoutes(data.data);
    }, [isLoading, data]);

    return { routes, isLoading };
}

function useRoutes({ direction, values }: Props) {
    const { sourceRoutes, destinationRoutes } = useSettingsState();
    const apiClient = new LayerSwapApiClient();
    const url = useMemo(() => resolveNetworkRoutesURL(direction, values), [direction, values]);
    const defaultRoutes = direction === 'from' ? sourceRoutes : destinationRoutes;
    return useRoutesData<NetworkRoute>(url, defaultRoutes || [], apiClient.fetcher);
}

// ---------- Token Helpers ----------

function resolveTokenUSDBalance(route: NetworkRoute, token: NetworkRouteToken, balances: Record<string, NetworkBalance>): number {
    const networkBalance = balances?.[route.name]?.balances || [];
    const match = networkBalance.find(b => b.token === token.symbol);
    return match?.amount && match.amount > 0 ? match.amount * token.price_in_usd : 0;
}


function sortRoutesByBalance(
    routes: NetworkRoute[],
    balances: Record<string, NetworkBalance> | null
): NetworkRoute[] {
    return routes.sort((a, b) => {
        const balanceA = balances?.[a.name]?.totalInUSD || 0;
        const balanceB = balances?.[b.name]?.totalInUSD || 0;

        if (balanceB !== balanceA) {
            return balanceB - balanceA;
        }

        return a.display_name.localeCompare(b.display_name);
    });
}

function sortGroupedTokensByBalance(tokenElements: GroupedTokenElement[], balances: Record<string, NetworkBalance>): GroupedTokenElement[] {
    return tokenElements.map(group => {
        const items = group?.items?.map(item => ({
            ...item,
            usdValue: resolveTokenUSDBalance(item.route.route, item.route.token, balances),
        })).sort((a, b) => b.usdValue - a.usdValue);
        const totalUSD = items?.reduce((sum, i) => sum + i.usdValue, 0);
        return { ...group, items, totalUSD };
    }).sort((a, b) => b.totalUSD - a.totalUSD)
}

function resolveSearch(routes: NetworkRoute[], search: string, direction: SwapDirection, balances: Record<string, NetworkBalance> | null, routesHistory: RoutesHistory): RowElement[] {
    const matchedNetworks = searchInNetworks(routes, search)
    const matchedTokens = searchInTokens(routes, search).sort(sortSuggestedTokenElements(direction, balances, routesHistory))
    return [
        ...(matchedNetworks.length ? [resolveTitle('Networks'), ...matchedNetworks] : []),
        ...(matchedTokens.length ? [resolveTitle('Tokens'), ...matchedTokens] : [])
    ];
}


const searchInNetworks = (routes: NetworkRoute[], search: string): NetworkElement[] => {
    const lower = search.toLowerCase().trim();

    return routes.filter(r => {
        const internalNameMatch = r.name.toLowerCase().includes(lower);
        const displayNameMatch = r.display_name?.toLowerCase().includes(lower);
        return internalNameMatch || displayNameMatch;
    }).map(r => ({ type: 'network', route: r }));
}

const searchInTokens = (routes: NetworkRoute[], search: string): NetworkTokenElement[] => {
    const lower = search.toLowerCase().replace(/\s+/g, " ").trim();

    return extractTokenElementsAsSuggested(routes).filter(e => {
        const { token, route } = e.route;

        const symbolMatch = token.symbol.toLowerCase().includes(lower);
        const contractMatch = token.contract?.toLowerCase().includes(lower);
        const nameMatch = token.display_asset?.toLowerCase().includes(lower);
        const splitted = lower.split(' ')
        const firstpart = splitted?.[0]
        const secondpart = splitted?.[1]

        const combo = (firstpart && secondpart) ? (
            (token.symbol.toLowerCase().includes(firstpart) && route.name.toLowerCase().includes(secondpart))
            ||
            (token.symbol.toLowerCase().includes(secondpart) && route.name.toLowerCase().includes(firstpart))
            ||
            (token.symbol.toLowerCase().includes(firstpart) && route.display_name.toLowerCase().includes(secondpart))
            ||
            (token.symbol.toLowerCase().includes(secondpart) && route.display_name.toLowerCase().includes(firstpart))
        ) : false

        return symbolMatch || contractMatch || nameMatch || combo;
    });
};
// ---------- Route Grouping ----------

function groupRoutes(
    routes: NetworkRoute[],
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    groupBy: 'token' | 'network' = 'network',
    recents: RoutesHistory,
    balancesLoading: boolean,
    search?: string
): RowElement[] {

    if (search) {
        return resolveSearch(routes, search, direction, balances, recents)
    }

    const suggestedRoutes = getSuggestedRoutes(routes, balances, recents, direction, balancesLoading)

    if (groupBy === "token") {
        const groupedTokens = resolveTokenRoutes(routes, balances, direction)
        return mergeGroups(suggestedRoutes, groupedTokens)
    }
    const groupedNetworks = resolveNetworkRoutes(routes, balances, direction)
    return mergeGroups(suggestedRoutes, groupedNetworks)
}

const mergeGroups = (suggestedRoutes: (NetworkTokenElement | TokenSceletonElement)[], allRoutes: GroupedTokenElement[] | NetworkElement[]) => {
    const allRoutesTitle = allRoutes.find(() => true)?.type === "grouped_token" ? 'All Tokens' : 'All Networks'
    return [
        ...(suggestedRoutes.length ? [resolveTitle('Suggestions'), ...suggestedRoutes] : []),
        resolveTitle(allRoutesTitle),
        ...allRoutes
    ]
}

const resolveNetworkRoutes = (routes: NetworkRoute[], balances: Record<string, NetworkBalance> | null, direction: SwapDirection): NetworkElement[] => {
    if (direction === "from" && balances) {
        return sortRoutesByBalance(routes, balances).map(r => ({
            type: 'network',
            route: { ...r, tokens: sortNetworkTokens(r, balances) }
        }))
    }
    return routes
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(r => ({ type: 'network', route: { ...r, tokens: r.tokens.sort((a, b) => a.symbol.localeCompare(b.symbol)) } }))
}

const resolveTokenRoutes = (routes: NetworkRoute[], balances: Record<string, NetworkBalance> | null, direction: SwapDirection): GroupedTokenElement[] => {
    const groupedRoutes = groupByTokens(routes)
    if (direction === "from" && balances)
        return sortGroupedTokensByBalance(groupedRoutes, balances)
    return groupedRoutes.sort((a, b) => a.symbol.localeCompare(b.symbol))

}

function groupExchanges(exchangesRoutes: (Exchange)[], search?: string): Exchange[] {
    if (search) {
        const exchanges = exchangesRoutes.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map((r): Exchange => ({ ...r }))

        return [
            ...exchanges,
        ]
    }

    const exchanges = exchangesRoutes
        .map((r): Exchange => ({ ...r }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return [
        ...exchanges,
    ]
}

// ---------- Token Grouping ----------

function groupByTokens(routes: NetworkRoute[]): GroupedTokenElement[] {
    const tokenMap: Record<string, NetworkTokenElement[]> = {};
    for (const r of routes) {
        for (const t of r.tokens || []) {
            const el: NetworkTokenElement = { type: 'network_token', route: { token: t, route: r } };
            if (!tokenMap[t.symbol]) tokenMap[t.symbol] = [];
            tokenMap[t.symbol].push(el);
        }
    }
    const result: GroupedTokenElement[] = Object.entries(tokenMap)
        .map(([symbol, items]) => ({
            type: 'grouped_token',
            symbol,
            items
        }));
    return result;
}

// ---------- Sorting ----------
function sortNetworkTokens(
    route: NetworkRoute,
    balances: Record<string, NetworkBalance> | null
): NetworkRouteToken[] {
    return [...(route.tokens || [])].sort((a, b) => {
        const balanceA = resolveTokenUSDBalance(route, a, balances || {});
        const balanceB = resolveTokenUSDBalance(route, b, balances || {});

        if (balanceB !== balanceA) {
            return balanceB - balanceA; // Descending by balance
        }

        return a.symbol.localeCompare(b.symbol); // Ascending by symbol
    });
}

// ---------- Resolvers ----------

function resolveSelectedRoute(values: SwapFormValues, direction: SwapDirection): NetworkRoute | undefined {
    return direction === 'from' ? values.from : values.to;
}

function resolveSelectedToken(values: SwapFormValues, direction: SwapDirection) {
    return direction === 'from' ? values.fromAsset : values.toAsset;
}

// ---------- Exchange ----------

function useExchangeRoutes({ values }: Props) {
    const { sourceExchanges } = useSettingsState();

    const apiClient = new LayerSwapApiClient()
    const exchangeRoutesURL = useMemo(() => resolveExchangesURLForSelectedToken(values), [values])
    const {
        data: apiResponse,
        isLoading,
    } = useSWR<ApiResponse<Exchange[]>>(exchangeRoutesURL, apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000 })

    const defaultData = sourceExchanges || []
    const [exchangesRoutes, setExchangesData] = useState<Exchange[]>(defaultData)

    useEffect(() => {
        if (!isLoading && apiResponse?.data) setExchangesData(apiResponse.data)
    }, [apiResponse])

    const res = exchangesRoutes.map(r => ({ ...r, cex: true } as { cex: true } & Exchange))

    return { exchangesRoutes: res, isLoading }
}

function getSuggestedRoutes(routes: NetworkRoute[], balances: Record<string, NetworkBalance> | null, routesHistory: RoutesHistory, direction: SwapDirection, balancesLoading: boolean, limit = 4): (NetworkTokenElement | TokenSceletonElement)[] {

    if (direction === "from") {
        if (!balancesLoading && !balances)
            return []
        if (balancesLoading && direction === "from")
            return Array(limit).fill({ type: "sceleton_token" });
    }

    const tokenElements = extractTokenElementsAsSuggested(routes).filter(t => t.route.token.status === "active")
    const sorted = tokenElements.sort(sortSuggestedTokenElements(direction, balances, routesHistory))
    return sorted.slice(0, limit)
}

const extractTokenElementsAsSuggested = (routes: NetworkRoute[]): NetworkTokenElement[] => routes.flatMap(route => (route.tokens || []).map(token => ({ type: 'suggested_token', route: { token, route } })))

const sortSuggestedTokenElements = (direction: SwapDirection, balances: Record<string, NetworkBalance> | null, routesHistory: RoutesHistory) => (a: NetworkTokenElement, b: NetworkTokenElement) => {
    if (direction === "from" && balances) {
        const a_balance = getNetworkTokenElementBalance(a, balances)
        const b_balance = getNetworkTokenElementBalance(b, balances)
        if (a_balance !== b_balance) {
            return b_balance - a_balance
        }
    }
    if (routesHistory) {
        const a_used = getUsedCount(a, routesHistory)
        const b_used = getUsedCount(b, routesHistory)
        if (a_used !== b_used) {
            return b_used - a_used
        }
    }

    const a_rank = getRank(a, direction)
    const b_rank = getRank(b, direction)
    return a_rank - b_rank
}

const getNetworkTokenElementBalance = (item: NetworkTokenElement, balances: Record<string, NetworkBalance>) => {
    return (balances[item.route.route.name]?.balances?.find(b => b.token === item.route.token.symbol)?.amount || 0) * item.route.token.price_in_usd
}
const getUsedCount = (item: NetworkTokenElement, history: RoutesHistory) => {
    return history[item.route.route.name]?.[item.route.token.symbol] || 0
}
const getRank = (item: NetworkTokenElement, direction: SwapDirection) => {
    switch (direction) {
        case "from":
            return item.route.token.source_rank || 0;
        case "to":
            return item.route.token.destination_rank || 0
    }
}
const resolveTitle = (text: string): TitleElement => {
    return { type: 'group_title', text }
}