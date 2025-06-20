import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { ApiResponse } from "../Models/ApiResponse";
import { NetworkRoute, NetworkRouteToken } from "../Models/Network";
import { useSettingsState } from "../context/settings";
import { NetworkElement, RowElement, NetworkTokenElement, TitleElement, GroupTokensResult, GroupedTokenElement } from "../Models/Route";
import useAllBalances from "./useAllBalances";
import { NetworkBalance } from "../Models/Balance";
import { resolveExchangesURLForSelectedToken, resolveNetworkRoutesURL } from "../helpers/routes";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import { Exchange } from "@/Models/Exchange";

const Titles: { [name: string]: TitleElement } = {
    topAssets: { type: 'group_title', text: 'Top Assets' },
    allNetworks: { type: 'group_title', text: 'All Networks' },
    popular: { type: 'group_title', text: 'Popular' },
    networks: { type: 'group_title', text: 'Networks' },
    tokens: { type: 'group_title', text: 'Tokens' },
    allTokens: { type: 'group_title', text: 'All' },
};

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
};

export default function useFormRoutes({ direction, values }: Props, search?: string) {
    const { routes, isLoading: routesLoading } = useRoutes({ direction, values });
    const balances = useAllBalances({ direction });

    const topTokens = useMemo(() => getTopTokens(routes, balances), [routes, balances]);
    const sortedRoutes = useMemo(() => sortRoutes(routes, direction, balances), [routes, direction, balances]);

    const routeElements = useMemo(() => {
        const grouped = groupRoutes(sortedRoutes, direction, balances, search);
        if (topTokens.length > 0 && !search) {
            return [Titles.topAssets, ...topTokens, ...grouped];
        }
        return grouped;
    }, [sortedRoutes, balances, direction, search, topTokens]);

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

function useRoutes({ direction, values }: Props) {
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

function getTopTokens(routes: NetworkRoute[], balances: Record<string, NetworkBalance> | null, limit = 4): NetworkTokenElement[] {
    if (!balances) return [];
    return routes.flatMap(route =>
        (route.tokens || []).map(token => {
            const usdValue = getTokenBalanceUSD(route, token, balances);
            return usdValue > 0 ? { token, route, usdValue } : null;
        }).filter(Boolean) as { token: NetworkRouteToken, route: NetworkRoute, usdValue: number }[]
    )
        .sort((a, b) => b.usdValue - a.usdValue)
        .slice(0, limit)
        .map(({ token, route }) => ({ type: 'top_token', route: { token, route } }));
}

function sortRoutes(routes: NetworkRoute[], direction: SwapDirection, balances: Record<string, NetworkBalance> | null): NetworkRoute[] {
    const sorted = [...routes];

    sorted.sort((a, b) => (direction !== 'to' && balances)
        ? (balances?.[b.name]?.totalInUSD || 0) - (balances?.[a.name]?.totalInUSD || 0)
        : a.display_name.localeCompare(b.display_name)
    )

    return sorted;
}

function sortGroupedTokensByBalance(tokenElements: GroupedTokenElement[], balances: Record<string, NetworkBalance>): GroupedTokenElement[] {
    return tokenElements.map(group => {
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
        const networks = routes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
            .map(r => ({ type: 'network', route: r }) as NetworkElement);

        const networkTokens = routes.flatMap(r =>
            (r.tokens || []).filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()))
                .map(t => ({ type: 'network_token', route: { token: t, route: r } }) as NetworkTokenElement)
        );

        return [
            ...(networks.length ? [Titles.networks, ...networks] : []),
            ...(networkTokens.length ? [Titles.tokens, ...networkTokens] : [])
        ];
    }

    const popularRoutes = resolvePopularRoutes(routes, direction);
    const popularNetworks = direction === 'to' ? routes
        .filter(r => popularRoutes.includes(r.name))
        .map(r => ({ type: 'network', route: r }) as NetworkElement) : [];

    const remaining = routes.map(r => ({ type: 'network', route: direction === 'from' ? { ...r, tokens: sortNetworkTokensByBalance(r, balances) } : r }) as NetworkElement);

    return [
        ...(popularNetworks.length ? [Titles.popular, ...popularNetworks] : []),
        ...(remaining.length ? [Titles.allNetworks, ...remaining] : [])
    ];
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
    return direction === 'from' ? values.fromAsset : values.toAsset;
}

function resolvePopularRoutes(routes: NetworkRoute[], direction: SwapDirection) {
    return routes.filter(r => r.tokens?.some(t => t.status === 'active'))
        .sort((a, b) => (direction === "from"
            ? (a.source_rank ?? 0) - (b.source_rank ?? 0)
            : (a.destination_rank ?? 0) - (b.destination_rank ?? 0)))
        .slice(0, 5)
        .map(r => r.name);
}

// ---------- Exchange ----------

function useExchangeRoutes({ direction, values }: Props) {
    const { sourceExchanges, destinationExchanges } = useSettingsState();

    const apiClient = new LayerSwapApiClient()
    const exchangeRoutesURL = useMemo(() => resolveExchangesURLForSelectedToken(direction, values), [direction, values])
    const {
        data: apiResponse,
        isLoading,
    } = useSWR<ApiResponse<Exchange[]>>(exchangeRoutesURL, apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000 })

    const defaultData = (direction === 'from' ? sourceExchanges : destinationExchanges) || []
    const [exchangesRoutes, setExchangesData] = useState<Exchange[]>(defaultData)

    useEffect(() => {
        if (!isLoading && apiResponse?.data) setExchangesData(apiResponse.data)
    }, [apiResponse])

    const res = useMemo(() => exchangesRoutes.map(r => ({ ...r, cex: true } as { cex: true } & Exchange)), [exchangesRoutes])

    return useMemo(() => ({ exchangesRoutes: res, isLoading }), [res, isLoading])
}