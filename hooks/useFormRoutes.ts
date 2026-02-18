
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
import { useRouteSortingStore, SortingOption } from "@/stores/routeSortingStore";
import { useQueryState } from "@/context/query";
import { getTotalBalanceInUSD } from "../helpers/balanceHelper";

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
};

export default function useFormRoutes({ direction, values }: Props, search?: string, suggestionsLimit: number = 4) {
    const { routes, isLoading: routesLoading } = useRoutes({ direction, values });
    const { exchangesRoutes, isLoading: exchangesRoutesLoading } = useExchangeRoutes({ direction, values })
    const { networks: withdrawalNetworks, isLoading: exchangeSourceNetworksLoading } = useExchangeNetworks({
        fromExchange: values.fromExchange?.name,
        to: values.to?.name,
        toAsset: values.toAsset?.symbol
    });
    const { lockFrom, from, lockTo, to, lockFromAsset, fromAsset, lockToAsset, toAsset } = useQueryState()
    const groupByToken = useRouteTokenSwitchStore((s) => s.showTokens)
    const sortingOption = useRouteSortingStore((s) => s.sortingOption)
    const { balances, partialPublished, isLoading } = useAllWithdrawalBalances();
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes)
    const loadingSuggestions = useMemo(() => {
        return !partialPublished && isLoading && direction === "from"
    }, [isLoading, direction, partialPublished])
    // Apply query-based filtering
    const filteredRoutes = useMemo(() => {
        const filtered = filterRoutesByQuery(routes, direction, { lockFrom, from, lockTo, to, lockFromAsset, fromAsset, lockToAsset, toAsset });
        return filtered;
    }, [routes, direction, lockFrom, from, lockTo, to, lockFromAsset, fromAsset, lockToAsset, toAsset]);

    const routeElements = useMemo(() =>
        groupRoutes({
            routes: filteredRoutes,
            direction,
            balances,
            groupBy: groupByToken ? "token" : "network",
            recents: routesHistory,
            balancesLoaded: loadingSuggestions,
            search,
            suggestionsLimit,
            sortingOption
        }),
        [filteredRoutes, balances, direction, search, groupByToken, routesHistory, loadingSuggestions, suggestionsLimit, sortingOption]);

    const exchanges = useMemo(() => {
        return groupExchanges(exchangesRoutes, search, direction, { lockFrom, from, lockTo, to });
    }, [exchangesRoutes, search, direction, lockFrom, from, lockTo, to]);


    const selectedRoute = useMemo(() => resolveSelectedRoute(values, direction), [values, direction]);
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction]);

    return useMemo(() => ({
        allRoutes: filteredRoutes,
        isLoading: routesLoading,
        routeElements,
        exchanges,
        exchangesRoutesLoading,
        exchangeNetworks: withdrawalNetworks,
        exchangeSourceNetworksLoading,
        selectedRoute,
        selectedToken,
    }), [
        filteredRoutes,
        routesLoading,
        routeElements,
        exchanges,
        exchangesRoutesLoading,
        withdrawalNetworks,
        exchangeSourceNetworksLoading,
        selectedRoute,
        selectedToken
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

// ---------- Query-based Filtering ----------

type QueryFilterParams = {
    lockFrom?: boolean;
    from?: string;
    lockTo?: boolean;
    to?: string;
    lockFromAsset?: boolean;
    fromAsset?: string;
    lockToAsset?: boolean;
    toAsset?: string;
};

function filterRoutesByQuery(
    routes: NetworkRoute[],
    direction: SwapDirection,
    queryParams: QueryFilterParams
): NetworkRoute[] {
    const { lockFrom, from, lockTo, to, lockFromAsset, fromAsset, lockToAsset, toAsset } = queryParams;

    const hasNetworkLock = direction === 'from' ? !!lockFrom : !!lockTo;
    const hasAssetLock = direction === 'from' ? !!lockFromAsset : !!lockToAsset;

    if (!hasNetworkLock && !hasAssetLock) return routes;

    // Resolve locked network (case-insensitive) and asset symbol (case-sensitive as before)
    const lockedNetworkName = direction === 'from'
        ? (lockFrom && from ? normalize(from) : undefined)
        : (lockTo && to ? normalize(to) : undefined);

    const lockedAssetSymbol = direction === 'from'
        ? (lockFromAsset ? fromAsset : undefined)
        : (lockToAsset ? toAsset : undefined);


    if (lockedNetworkName) {
        const filteredRoutes = routes.filter(r => normalize(r.name) === lockedNetworkName);
        if (lockedAssetSymbol) {
            return filteredRoutes
                .map(route => {
                    const filteredTokens = route.tokens?.filter(t => t.symbol === lockedAssetSymbol) || [];
                    return filteredTokens.length > 0 ? { ...route, tokens: filteredTokens } : null;
                })
                .filter((r): r is NetworkRoute => r !== null);
        }
        return filteredRoutes;
    }

    return routes;
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


// ---------- Sorting Functions ----------


function sortRoutesByMostUsed(
    routes: NetworkRoute[],
    routesHistory: RoutesHistory,
    direction: SwapDirection
): NetworkRoute[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const history = routesHistory[historyKey] || {};

    return [...routes].sort((a, b) => {
        // Calculate total usage count for each route across all tokens
        const aUsage = Object.values(history[a.name] || {}).reduce((sum, count) => sum + count, 0);
        const bUsage = Object.values(history[b.name] || {}).reduce((sum, count) => sum + count, 0);
        
        if (bUsage !== aUsage) {
            return bUsage - aUsage;
        }
        return a.display_name.localeCompare(b.display_name);
    });
}

function sortRoutesByTrending(
    routes: NetworkRoute[],
    direction: SwapDirection
): NetworkRoute[] {
    // Use rank as a proxy for trending
    return [...routes].sort((a, b) => {
        const rankKey = direction === 'from' ? 'source_rank' : 'destination_rank';
        const aRank = a[rankKey] || 999999;
        const bRank = b[rankKey] || 999999;
        
        if (aRank !== bRank) {
            return aRank - bRank;
        }
        return a.display_name.localeCompare(b.display_name);
    });
}

function sortRoutesAlphabetically(
    routes: NetworkRoute[],
    ascending: boolean = true
): NetworkRoute[] {
    return [...routes].sort((a, b) => {
        const comparison = a.display_name.localeCompare(b.display_name);
        return ascending ? comparison : -comparison;
    });
}

function sortRoutes(
    routes: NetworkRoute[],
    sortingOption: SortingOption,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): NetworkRoute[] {
    switch (sortingOption) {
        case 'relevance':
            return sortRoutesByRelevance(routes, balances, routesHistory, direction);
        case 'most_used':
            return sortRoutesByMostUsed(routes, routesHistory, direction);
        case 'trending':
            return sortRoutesByTrending(routes, direction);
        case 'alphabetical_asc':
            return sortRoutesAlphabetically(routes, true);
        case 'alphabetical_desc':
            return sortRoutesAlphabetically(routes, false);
        default:
            return routes;
    }
}


function sortTokensByMostUsed(
    tokens: NetworkRouteToken[],
    route: NetworkRoute,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): NetworkRouteToken[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const routeHistory = routesHistory[historyKey]?.[route.name] || {};

    return [...tokens].sort((a, b) => {
        const aUsage = routeHistory[a.symbol] || 0;
        const bUsage = routeHistory[b.symbol] || 0;
        
        if (bUsage !== aUsage) {
            return bUsage - aUsage;
        }
        return a.symbol.localeCompare(b.symbol);
    });
}

function sortTokensByTrending(
    tokens: NetworkRouteToken[],
    direction: SwapDirection
): NetworkRouteToken[] {
    return [...tokens].sort((a, b) => {
        const rankKey = direction === 'from' ? 'source_rank' : 'destination_rank';
        const aRank = a[rankKey] || 999999;
        const bRank = b[rankKey] || 999999;
        
        if (aRank !== bRank) {
            return aRank - bRank;
        }
        return a.symbol.localeCompare(b.symbol);
    });
}

function sortTokensAlphabetically(
    tokens: NetworkRouteToken[],
    ascending: boolean = true
): NetworkRouteToken[] {
    return [...tokens].sort((a, b) => {
        const comparison = a.symbol.localeCompare(b.symbol);
        return ascending ? comparison : -comparison;
    });
}

function sortTokens(
    tokens: NetworkRouteToken[],
    route: NetworkRoute,
    sortingOption: SortingOption,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): NetworkRouteToken[] {
    switch (sortingOption) {
        case 'relevance':
            return sortTokensByRelevance(tokens, route, balances, routesHistory, direction);
        case 'most_used':
            return sortTokensByMostUsed(tokens, route, routesHistory, direction);
        case 'trending':
            return sortTokensByTrending(tokens, direction);
        case 'alphabetical_asc':
            return sortTokensAlphabetically(tokens, true);
        case 'alphabetical_desc':
            return sortTokensAlphabetically(tokens, false);
        default:
            return tokens;
    }
}

function sortGroupedTokens(
    tokenElements: GroupedTokenElement[],
    sortingOption: SortingOption,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): GroupedTokenElement[] {
    // Sort items within each group
    const groupsWithSortedItems = tokenElements.map(group => {
        const sortedItems = sortGroupedTokenItems(group.items, sortingOption, direction, balances, routesHistory);
        const totalUSD = balances 
            ? sortedItems.reduce((sum, item) => sum + resolveTokenUSDBalance(item.route.route, item.route.token, balances), 0)
            : 0;
        return { ...group, items: sortedItems, totalUSD };
    });

    // Sort groups themselves
    switch (sortingOption) {
        case 'relevance':
            return sortGroupedTokensByRelevance(groupsWithSortedItems, balances, routesHistory, direction);
        case 'most_used':
            return groupsWithSortedItems.sort((a, b) => {
                const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
                const history = routesHistory[historyKey] || {};
                const aUsage = Object.values(history).reduce((sum, routes) => sum + (routes[a.symbol] || 0), 0);
                const bUsage = Object.values(history).reduce((sum, routes) => sum + (routes[b.symbol] || 0), 0);
                return bUsage - aUsage || a.symbol.localeCompare(b.symbol);
            });
        case 'trending': {
            const rankKey = direction === 'from' ? 'source_rank' : 'destination_rank';
            return groupsWithSortedItems.sort((a, b) => {
                const aMinRank = Math.min(...a.items.map(i => i.route.token[rankKey] || 999999));
                const bMinRank = Math.min(...b.items.map(i => i.route.token[rankKey] || 999999));
                return aMinRank - bMinRank || a.symbol.localeCompare(b.symbol);
            });
        }
        case 'alphabetical_asc':
            return groupsWithSortedItems.sort((a, b) => a.symbol.localeCompare(b.symbol));
        case 'alphabetical_desc':
            return groupsWithSortedItems.sort((a, b) => b.symbol.localeCompare(a.symbol));
        default:
            return groupsWithSortedItems;
    }
}

function sortGroupedTokenItems(
    items: NetworkTokenElement[],
    sortingOption: SortingOption,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): NetworkTokenElement[] {
    switch (sortingOption) {
        case 'relevance':
            return sortTokenItemsByRelevance(items, balances, routesHistory, direction);
        case 'most_used':
            return [...items].sort((a, b) => {
                const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
                const aUsage = routesHistory[historyKey]?.[a.route.route.name]?.[a.route.token.symbol] || 0;
                const bUsage = routesHistory[historyKey]?.[b.route.route.name]?.[b.route.token.symbol] || 0;
                return bUsage - aUsage || a.route.route.display_name.localeCompare(b.route.route.display_name);
            });
        case 'trending': {
            const rankKey = direction === 'from' ? 'source_rank' : 'destination_rank';
            return [...items].sort((a, b) => {
                const aRank = a.route.token[rankKey] || 999999;
                const bRank = b.route.token[rankKey] || 999999;
                return aRank - bRank || a.route.route.display_name.localeCompare(b.route.route.display_name);
            });
        }
        case 'alphabetical_asc':
            return [...items].sort((a, b) => a.route.route.display_name.localeCompare(b.route.route.display_name));
        case 'alphabetical_desc':
            return [...items].sort((a, b) => b.route.route.display_name.localeCompare(a.route.route.display_name));
        default:
            return items;
    }
}

function sortRoutesByRelevance(
    routes: NetworkRoute[],
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): NetworkRoute[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const history = routesHistory[historyKey] || {};
    const rankKey = direction === 'from' ? 'source_rank' : 'destination_rank';

    return [...routes].sort((a, b) => {
        const aBalance = balances?.[a.name] ? getTotalBalanceInUSD(balances[a.name], a) || 0 : 0;
        const bBalance = balances?.[b.name] ? getTotalBalanceInUSD(balances[b.name], b) || 0 : 0;
        if (aBalance !== bBalance) return bBalance - aBalance;

        const aUsage = Object.values(history[a.name] || {}).reduce((sum, count) => sum + count, 0);
        const bUsage = Object.values(history[b.name] || {}).reduce((sum, count) => sum + count, 0);
        if (aUsage !== bUsage) return bUsage - aUsage;

        const aRank = a[rankKey] || 999999;
        const bRank = b[rankKey] || 999999;
        if (aRank !== bRank) return aRank - bRank;

        return a.display_name.localeCompare(b.display_name);
    });
}

function sortTokensByRelevance(
    tokens: NetworkRouteToken[],
    route: NetworkRoute,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): NetworkRouteToken[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const routeHistory = routesHistory[historyKey]?.[route.name] || {};
    const rankKey = direction === 'from' ? 'source_rank' : 'destination_rank';

    return [...tokens].sort((a, b) => {
        const aBalance = balances ? resolveTokenUSDBalance(route, a, balances) : 0;
        const bBalance = balances ? resolveTokenUSDBalance(route, b, balances) : 0;
        if (aBalance !== bBalance) return bBalance - aBalance;

        const aUsage = routeHistory[a.symbol] || 0;
        const bUsage = routeHistory[b.symbol] || 0;
        if (aUsage !== bUsage) return bUsage - aUsage;

        const aRank = a[rankKey] || 999999;
        const bRank = b[rankKey] || 999999;
        if (aRank !== bRank) return aRank - bRank;

        return a.symbol.localeCompare(b.symbol);
    });
}

function sortGroupedTokensByRelevance(
    groups: (GroupedTokenElement & { totalUSD: number })[],
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): GroupedTokenElement[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const history = routesHistory[historyKey] || {};
    const rankKey = direction === 'from' ? 'source_rank' : 'destination_rank';

    return groups.sort((a, b) => {
        if (a.totalUSD !== b.totalUSD) return b.totalUSD - a.totalUSD;

        const aUsage = Object.values(history).reduce((sum, routes) => sum + (routes[a.symbol] || 0), 0);
        const bUsage = Object.values(history).reduce((sum, routes) => sum + (routes[b.symbol] || 0), 0);
        if (aUsage !== bUsage) return bUsage - aUsage;

        const aMinRank = Math.min(...a.items.map(i => i.route.token[rankKey] || 999999));
        const bMinRank = Math.min(...b.items.map(i => i.route.token[rankKey] || 999999));
        if (aMinRank !== bMinRank) return aMinRank - bMinRank;

        return a.symbol.localeCompare(b.symbol);
    });
}

function sortTokenItemsByRelevance(
    items: NetworkTokenElement[],
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): NetworkTokenElement[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const rankKey = direction === 'from' ? 'source_rank' : 'destination_rank';

    return [...items].sort((a, b) => {
        const aBalance = balances ? resolveTokenUSDBalance(a.route.route, a.route.token, balances) : 0;
        const bBalance = balances ? resolveTokenUSDBalance(b.route.route, b.route.token, balances) : 0;
        if (aBalance !== bBalance) return bBalance - aBalance;

        const aUsage = routesHistory[historyKey]?.[a.route.route.name]?.[a.route.token.symbol] || 0;
        const bUsage = routesHistory[historyKey]?.[b.route.route.name]?.[b.route.token.symbol] || 0;
        if (aUsage !== bUsage) return bUsage - aUsage;

        const aRank = a.route.token[rankKey] || 999999;
        const bRank = b.route.token[rankKey] || 999999;
        if (aRank !== bRank) return aRank - bRank;

        return a.route.route.display_name.localeCompare(b.route.route.display_name);
    });
}

function resolveSearch(routes: NetworkRoute[], search: string, direction: SwapDirection, balances: Record<string, NetworkBalance> | null, routesHistory: RoutesHistory): RowElement[] {
    const matchedNetworks = searchInNetworks(routes, search, direction, balances)
    const matchedTokens = searchInTokens(routes, search).sort(sortSuggestedTokenElements(direction, balances, routesHistory))
    return [
        ...(matchedNetworks.length ? [resolveTitle('Networks'), ...matchedNetworks] : []),
        ...(matchedTokens.length ? [resolveTitle('Tokens'), ...matchedTokens] : [])
    ];
}


const searchInNetworks = (routes: NetworkRoute[], search: string, direction: SwapDirection, balances: Record<string, NetworkBalance> | null): NetworkElement[] => {
    const lower = search.toLowerCase().trim();

    return routes.filter(r => {
        const internalNameMatch = r.name.toLowerCase().includes(lower);
        const displayNameMatch = r.display_name?.toLowerCase().includes(lower);
        return internalNameMatch || displayNameMatch;
    }).map(r => ({
        type: 'network',
        route: {
            ...r,
            tokens: (direction === "from" && balances)
                ? sortNetworkTokens(r, balances)
                : r.tokens
        }
    }));
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

type GroupRoutesProps = {
    routes: NetworkRoute[];
    direction: SwapDirection;
    balances: Record<string, NetworkBalance> | null;
    groupBy: 'token' | 'network';
    recents: RoutesHistory;
    balancesLoaded: boolean;
    search?: string;
    suggestionsLimit?: number;
    sortingOption?: SortingOption;
}

function groupRoutes(
    { routes, direction, balances, groupBy, recents, balancesLoaded, search, suggestionsLimit = 4, sortingOption = SortingOption.RELEVANCE }: GroupRoutesProps
): RowElement[] {

    if (search) {
        return resolveSearch(routes, search, direction, balances, recents)
    }

    // Suggestions always use relevance-based sorting (unchanged)
    const suggestedRoutes = getSuggestedRoutes(routes, balances, recents, direction, balancesLoaded, suggestionsLimit)

    // Apply custom sorting ONLY to "All Networks/All Tokens" section
    if (groupBy === "token") {
        const groupedTokens = resolveTokenRoutes(routes, balances, direction, recents, sortingOption)
        return mergeGroups(suggestedRoutes, groupedTokens)
    }
    const groupedNetworks = resolveNetworkRoutes(routes, balances, direction, recents, sortingOption)
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

const resolveNetworkRoutes = (
    routes: NetworkRoute[], 
    balances: Record<string, NetworkBalance> | null, 
    direction: SwapDirection,
    routesHistory: RoutesHistory,
    sortingOption: SortingOption = SortingOption.RELEVANCE
): NetworkElement[] => {
    // Sort routes based on selected option
    const sortedRoutes = sortRoutes(routes, sortingOption, direction, balances, routesHistory);
    
    return sortedRoutes.map(r => ({
        type: 'network',
        route: { 
            ...r, 
            tokens: sortTokens(r.tokens, r, sortingOption, direction, balances, routesHistory)
        }
    }));
}

const resolveTokenRoutes = (
    routes: NetworkRoute[], 
    balances: Record<string, NetworkBalance> | null, 
    direction: SwapDirection,
    routesHistory: RoutesHistory,
    sortingOption: SortingOption = SortingOption.RELEVANCE
): GroupedTokenElement[] => {
    const groupedRoutes = groupByTokens(routes);
    return sortGroupedTokens(groupedRoutes, sortingOption, direction, balances, routesHistory);
}

function filterExchangesByQuery(
    exchanges: Exchange[],
    direction: SwapDirection,
    queryParams: QueryFilterParams
): Exchange[] {
    const { lockFrom, from, lockTo, to } = queryParams;

    const hasNetworkLock = direction === 'from' ? !!lockFrom : !!lockTo;
    if (!hasNetworkLock) return exchanges;

    const lockedExchangeName = direction === 'from'
        ? (lockFrom && from ? normalize(from) : undefined)
        : (lockTo && to ? normalize(to) : undefined);

    if (lockedExchangeName) return exchanges.filter(e => normalize(e.name) === lockedExchangeName);

    return exchanges;
}

function groupExchanges(exchangesRoutes: (Exchange)[], search?: string, direction?: SwapDirection, queryParams?: QueryFilterParams): Exchange[] {
    let exchanges = exchangesRoutes.map((r): Exchange => ({ ...r }));

    // Apply query-based filtering if parameters are provided
    if (direction && queryParams) {
        exchanges = filterExchangesByQuery(exchanges, direction, queryParams);
    }

    if (search) {
        exchanges = exchanges.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    }

    return exchanges.sort((a, b) => a.name.localeCompare(b.name));
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

function getSuggestedRoutes(routes: NetworkRoute[], balances: Record<string, NetworkBalance> | null, routesHistory: RoutesHistory, direction: SwapDirection, balancesLoading: boolean, limit: number = 4): (NetworkTokenElement | TokenSceletonElement)[] {
    // Ensure minimum of 4 suggestions
    const effectiveLimit = Math.max(4, limit);

    if (direction === "from") {
        if (!balancesLoading && !balances)
            return []
        if (balancesLoading && direction === "from")
            return Array(effectiveLimit).fill({ type: "sceleton_token" });
    }
    
    const tokenElements = extractTokenElementsAsSuggested(routes).filter(t => t.route.token.status === "active")
    const sorted = tokenElements.sort(sortSuggestedTokenElements(direction, balances, routesHistory))
    return sorted.slice(0, effectiveLimit)
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
        const a_used = getUsedCount(a, routesHistory, direction)
        const b_used = getUsedCount(b, routesHistory, direction)
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
const getUsedCount = (item: NetworkTokenElement, history: RoutesHistory, direction: SwapDirection) => {
    return direction === "from" ? history.sourceRoutes?.[item.route.route.name]?.[item.route.token.symbol] || 0 : history.destinationRoutes?.[item.route.route.name]?.[item.route.token.symbol] || 0
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

const normalize = (v?: string) => (v ?? "").toLowerCase();