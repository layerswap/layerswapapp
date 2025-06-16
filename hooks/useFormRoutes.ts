import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { ApiResponse } from "../Models/ApiResponse";
import { NetworkRoute, NetworkRouteToken } from "../Models/Network";
import { useSettingsState } from "../context/settings";
import { NetworkElement, RowElement, NetworkTokenElement, _Route, _RoutesGroup, TitleElement, GroupTokensResult, GroupedTokenElement } from "../Models/Route";
import useAllBalances from "./useAllBalances";
import { NetworkBalance } from "../Models/Balance";
import { resolveNetworkRoutesURL } from "../helpers/routes";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";

const Titles = {
    topAssets: { type: 'group_title', text: 'Top Assets' } as TitleElement,
    allNetworks: { type: 'group_title', text: 'All Networks' } as TitleElement,
    popular: { type: 'group_title', text: 'Popular' } as TitleElement,
    networks: { type: 'group_title', text: 'Networks' } as TitleElement,
    tokens: { type: 'group_title', text: 'Tokens' } as TitleElement,
    allTokens: { type: 'group_title', text: 'All' } as TitleElement,
};

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
};

export default function useFormRoutes({ direction, values }: Props, search?: string) {
    const { routes, isLoading: routesLoading } = useroutes({ direction, values });
    const balances = useAllBalances({ direction });

    const topTokens = useMemo(() => getTopTokens(routes, balances), [routes, balances]);

    const routeElements = useMemo(() => {
        const grouped = groupRoutes(routes, direction, balances, search);
        if (topTokens.length > 0 && !search) {
            return [Titles.topAssets, ...topTokens, ...grouped];
        }
        return grouped;
    }, [routes, balances, direction, search, topTokens]);

    const tokenElements = useMemo(() => {
        const grouped = groupTokens(routes, search);
        if (!search && balances) {
            const sorted = sortGroupedTokensByBalance(grouped as GroupedTokenElement[], balances);
            return topTokens.length > 0 ? [Titles.topAssets, ...topTokens, ...sorted] : [Titles.allTokens, ...sorted];
        }
        return grouped;
    }, [routes, balances, search, topTokens]);

    const selectedRoute = useMemo(() => resolveSelectedRoute(values, direction), [values, direction]);
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction]);

    return useMemo(() => ({
        allRoutes: routes,
        isLoading: routesLoading,
        routeElements,
        tokenElements,
        selectedRoute,
        selectedToken,
        allbalancesLoaded: !!balances,
    }), [
        routes,
        routesLoading,
        routeElements,
        tokenElements,
        selectedRoute,
        selectedToken,
        balances,
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

function useroutes({ direction, values }: Props) {
    const { sourceRoutes, destinationRoutes } = useSettingsState();
    const apiClient = new LayerSwapApiClient();
    const url = useMemo(() => resolveNetworkRoutesURL(direction, values), [direction, values]);
    const defaultRoutes = direction === 'from' ? sourceRoutes : destinationRoutes;
    return useRoutesData<NetworkRoute>(url, defaultRoutes || [], apiClient.fetcher);
}

// ---------- Token Helpers ----------

function getTokenBalanceUSD(route: NetworkRoute, token: NetworkRouteToken, balances: Record<string, NetworkBalance>): number {
    const networkBalance = balances?.[route.name]?.balances || [];
    const match = networkBalance.find(b => b.token === token.symbol);
    return match && match.amount > 0 ? match.amount * token.price_in_usd : 0;
}

function getTopTokens(
    routes: NetworkRoute[],
    balances: Record<string, NetworkBalance> | null,
    limit = 4
): NetworkTokenElement[] {
    if (!balances) return [];
    const tokens = routes.flatMap(route =>
        (route.tokens || []).map(token => {
            const usdValue = getTokenBalanceUSD(route, token, balances);
            return usdValue > 0 ? { token, route, usdValue } : null;
        }).filter(Boolean) as { token: NetworkRouteToken, route: NetworkRoute, usdValue: number }[]
    );
    return tokens
        .sort((a, b) => b.usdValue - a.usdValue)
        .slice(0, limit)
        .map(({ token, route }) => ({
            type: 'top_token',
            route: { token, route }
        }));
}

function sortGroupedTokensByBalance(
    tokenElements: GroupedTokenElement[],
    balances: Record<string, NetworkBalance>
): GroupedTokenElement[] {
    return tokenElements
        .map(group => {
            const items = group?.items?.map(item => ({
                ...item,
                usdValue: getTokenBalanceUSD(item.route.route, item.route.token, balances),
            })).sort((a, b) => b.usdValue - a.usdValue);
            const totalUSD = items?.reduce((sum, i) => sum + i.usdValue, 0);
            return { ...group, items, totalUSD };
        })
        .sort((a, b) => b.totalUSD - a.totalUSD)
        .map(({ totalUSD, ...rest }) => rest);
}

// ---------- Route Grouping ----------

function groupRoutes(routes: NetworkRoute[], direction: SwapDirection, balances: Record<string, NetworkBalance> | null, search?: string): RowElement[] {
    if (search) {
        const networks = routes
            .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
            .map(r => ({ type: 'network', route: { ...r } } as NetworkElement))
            .sort((a, b) => (balances?.[b.route.name]?.totalInUSD || 0) - (balances?.[a.route.name]?.totalInUSD || 0));
        const networkTokens = routes.flatMap(r =>
            (r.tokens || [])
                .filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()))
                .map(t => ({ type: 'network_token', route: { token: t, route: { ...r } } } as NetworkTokenElement))
        );
        return [
            ...(networks.length ? [Titles.networks, ...networks] : []),
            ...(networkTokens.length ? [Titles.tokens, ...networkTokens] : [])
        ];
    }

    const popularRoutes = direction === 'to'
        ? resolvePopularRoutes(routes, direction)
        : [];

    const popularNetworks = direction === 'to'
        ? routes
            .filter(r => popularRoutes.includes(r.name))
            .map(r => ({ type: 'network', route: { ...r } } as NetworkElement))
            .sort((a, b) => (balances?.[b.route.name]?.totalInUSD || 0) - (balances?.[a.route.name]?.totalInUSD || 0))
        : [];

    const unsortedNetworks = routes
        .filter(r => !popularRoutes.includes(r.name))
        .map(r => {
            const sortedTokens = direction === 'from' ? sortNetworkTokensByBalance(r, balances) : r.tokens;
            return { type: 'network', route: { ...r, tokens: sortedTokens } } as NetworkElement
        });

    const sortedNetworks = unsortedNetworks.sort((a, b) => {
        if (direction !== 'to' && balances) {
            return (balances[b.route.name]?.totalInUSD || 0) - (balances[a.route.name]?.totalInUSD || 0);
        }
        return a.route.display_name.localeCompare(b.route.display_name);
    });

    return [
        ...(popularNetworks.length ? [Titles.popular, ...popularNetworks] : []),
        ...(sortedNetworks.length ? [Titles.allNetworks, ...sortedNetworks] : [])
    ];
}

function resolvePopularRoutes(routes: NetworkRoute[], direction: SwapDirection) {
    return routes.filter(r => r.tokens?.some(t => t.status === 'active'))
        .sort((a, b) => (direction === "from"
            ? (a.source_rank ?? 0) - (b.source_rank ?? 0)
            : (a.destination_rank ?? 0) - (b.destination_rank ?? 0)))
        .slice(0, 5)
        .map(r => r.name);
}

// ---------- Token Grouping ----------

function groupTokens(routes: NetworkRoute[], search?: string): GroupTokensResult {
    if (search) {
        const lower = search.toLowerCase();
        const networks = routes
            .filter(r => r.name.toLowerCase().includes(lower))
            .map(r => ({ type: 'network', route: { ...r } } as NetworkElement))
        const networkTokens = routes.flatMap(r =>
            (r.tokens || [])
                .filter(t => t.symbol.toLowerCase().includes(lower))
                .map(t => ({ type: 'network_token', route: { token: t, route: { ...r } } } as NetworkTokenElement))
        );
        return [...networks, ...networkTokens];
    }

    const tokenMap: Record<string, NetworkTokenElement[]> = {};
    for (const r of routes) {
        for (const t of r.tokens || []) {
            const el: NetworkTokenElement = { type: 'network_token', route: { token: t, route: r } };
            if (!tokenMap[t.symbol]) tokenMap[t.symbol] = [];
            tokenMap[t.symbol].push(el);
        }
    }

    const groupedTokens: GroupedTokenElement[] = Object.entries(tokenMap).map(([symbol, items]) => ({
        type: 'grouped_token',
        symbol,
        items,
    }));

    return [Titles.allTokens, ...groupedTokens];
}

// ---------- Sorting ----------

function sortNetworkTokensByBalance(route: NetworkRoute, balances: Record<string, NetworkBalance> | null): NetworkRouteToken[] {
    return [...(route.tokens || [])].sort((a, b) =>
        getTokenBalanceUSD(route, b, balances || {}) - getTokenBalanceUSD(route, a, balances || {})
    );
}

// ---------- Resolvers ----------

function resolveSelectedRoute(values: SwapFormValues, direction: SwapDirection): NetworkRoute | undefined {
    return direction === 'from' ? values.from : values.to;
}

function resolveSelectedToken(values: SwapFormValues, direction: SwapDirection) {
    return direction === 'from' ? values.fromCurrency : values.toCurrency;
}
