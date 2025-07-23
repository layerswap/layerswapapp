import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { ApiResponse } from "../Models/ApiResponse";
import { NetworkRoute, NetworkRouteToken } from "../Models/Network";
import { useSettingsState } from "../context/settings";
import { NetworkElement, RowElement, NetworkTokenElement, TitleElement, GroupTokensResult, GroupedTokenElement } from "../Models/Route";
import useAllBalances from "./useBalances/useAllBalances";
import { NetworkBalance } from "../Models/Balance";
import { resolveExchangesURLForSelectedToken, resolveNetworkRoutesURL, resolveRoutesURLForSelectedAssetGroup } from "../helpers/routes";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import { Exchange, ExchangeToken } from "@/Models/Exchange";
import useExchangeNetworks from "./useExchangeNetworks";
import { useRouteTokenSwitchStore } from "@/stores/routeTokenSwitchStore";
import useSelectedWalletStore from "@/context/selectedAccounts/pickerSelectedWallets";

const Titles: { [name: string]: TitleElement } = {
    topAssets: { type: 'group_title', text: 'Top Assets' },
    allNetworks: { type: 'group_title', text: 'All Networks' },
    popular: { type: 'group_title', text: 'Popular' },
    networks: { type: 'group_title', text: 'Networks' },
    tokens: { type: 'group_title', text: 'Tokens' },
    allTokens: { type: 'group_title', text: 'All Tokens' },
};

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
};

export default function useFormRoutes({ direction, values }: Props, search?: string) {
    const { routes, isLoading: routesLoading } = useRoutes({ direction, values });
    const { exchangesRoutes, isLoading: exchangesRoutesLoading } = useExchangeRoutes({ direction, values })
    const { networks: withdrawalNetworks, isLoading: exchangeSourceNetworksLoading } = useExchangeNetworks({ values });
    const groupByToken = useRouteTokenSwitchStore((s) => s.showTokens)
    const { pickerSelectedWallets } = useSelectedWalletStore(direction)

    const balances = useAllBalances({ direction, pickerSelectedWallets });
    const exchange = values.fromExchange

    const routeElements = useMemo(() => groupRoutes(routes, direction, balances, groupByToken ? "token" : "network", search), [routes, balances, direction, search, groupByToken]);

    const exchanges = useMemo(() => {
        const grouped = groupExchanges(exchangesRoutes, search);
        return grouped;
    }, [exchangesRoutes, direction, search, values]);

    const exchangeNetworks = useMemo(() => {
        return withdrawalNetworks;
    }, [withdrawalNetworks, exchange, search]);


    const selectedRoute = useMemo(() => resolveSelectedRoute(values, direction), [values, direction]);
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction]);

    return useMemo(() => ({
        allRoutes: routes,
        isLoading: routesLoading,
        routeElements,
        exchanges,
        exchangesRoutesLoading,
        exchangeNetworks,
        exchangeSourceNetworksLoading,
        selectedRoute,
        selectedToken,
        allbalancesLoaded: !!balances,
    }), [
        routes,
        routesLoading,
        routeElements,
        exchanges,
        exchangesRoutesLoading,
        exchangeNetworks,
        exchangeSourceNetworksLoading,
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

function resolveTokenUSDBalance(route: NetworkRoute, token: NetworkRouteToken, balances: Record<string, NetworkBalance>): number {
    const networkBalance = balances?.[route.name]?.balances || [];
    const match = networkBalance.find(b => b.token === token.symbol);
    return match && match.amount > 0 ? match.amount * token.price_in_usd : 0;
}

function getTopTokensByBalance(routes: NetworkRoute[], balances: Record<string, NetworkBalance> | null, limit = 4): NetworkTokenElement[] {
    if (!balances) return [];
    return routes.flatMap(route =>
        (route.tokens || []).map(token => {
            const usdValue = resolveTokenUSDBalance(route, token, balances);
            return usdValue > 0 ? { token, route, usdValue } : null;
        }).filter(Boolean) as { token: NetworkRouteToken, route: NetworkRoute, usdValue: number }[]
    )
        .sort((a, b) => b.usdValue - a.usdValue)
        .slice(0, limit)
        .map(({ token, route }) => ({ type: 'top_token', route: { token, route } }));
}

function sortRoutesByBalance(
    routes: NetworkRoute[],
    balances: Record<string, NetworkBalance> | null
): NetworkRoute[] {
    return [...routes].sort((a, b) => {
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

function resolveSearch(routes: NetworkRoute[], search: string) {
    const matchedNetworks = routes.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase())
    ).map(r => ({ type: 'network', route: r }) as NetworkElement);

    const matchedTokens = routes.flatMap(r =>
        (r.tokens || []).filter(t =>
            t.symbol.toLowerCase().includes(search.toLowerCase())
        ).map(t => ({ type: 'network_token', route: { token: t, route: r } }) as NetworkTokenElement)
    );

    return [
        ...(matchedNetworks.length ? [Titles.networks, ...matchedNetworks] : []),
        ...(matchedTokens.length ? [Titles.tokens, ...matchedTokens] : [])
    ];
}
// ---------- Route Grouping ----------
function groupSourceRoutes(routes: NetworkRoute[],
    balances: Record<string, NetworkBalance> | null,
    groupBy: 'token' | 'network' = 'network'): RowElement[] {

    const topTokens = getTopTokensByBalance(routes, balances)

    if (!balances || !topTokens.length)
        return groupRoutesWithoutBalanceSorting(routes, groupBy)

    const remaining = groupBy === "network" ? sortRoutesByBalance(routes, balances)
        .map(r => ({
            type: 'network',
            route: { ...r, tokens: sortNetworkTokens(r, balances) }
        }) as NetworkElement)
        : sortGroupedTokensByBalance(groupByTokens(routes), balances)

    return [
        ...(topTokens && topTokens.length > 0 ? [Titles.topAssets, ...topTokens] : []),
        ...(remaining.length ? [groupBy === "network" ? Titles.allNetworks : Titles.allTokens, ...remaining] : [])
    ];
}

function groupRoutesWithoutBalanceSorting(routes: NetworkRoute[],
    groupBy: 'token' | 'network' = 'network'): RowElement[] {

    const popularRouteNames = resolvePopularRoutes(routes, "to")

    const popularNetworks = popularRouteNames.length > 0
        ? routes
            .filter(r => popularRouteNames.includes(r.name))
            .map(r => ({ type: 'network', route: r }) as NetworkElement)
        : [];

    const remaining = groupBy === "network" ?
        resolveRemainingRoutes(routes, popularRouteNames)
        : groupByTokens(routes)

    return [
        ...(popularNetworks.length ? [Titles.popular, ...popularNetworks] : []),
        ...(remaining.length ? [groupBy === "network" ? Titles.allNetworks : Titles.allTokens, ...remaining] : [])
    ];
}

function resolveRemainingRoutes(routes: NetworkRoute[], filterOut: string[]): NetworkElement[] {
    return routes
        .filter(r => !filterOut.includes(r.name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(r => ({ type: 'network', route: { ...r, tokens: r.tokens.sort((a, b) => a.symbol.localeCompare(b.symbol)) } }))
}

function groupRoutes(
    routes: NetworkRoute[],
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    groupBy: 'token' | 'network' = 'network',
    search?: string
): RowElement[] {

    if (search) {
        return resolveSearch(routes, search)
    }
    return direction === 'from' ?
        groupSourceRoutes(routes, balances, groupBy) :
        groupRoutesWithoutBalanceSorting(routes, groupBy);
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
        .sort(([a], [b]) => a.localeCompare(b))
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

    const res = exchangesRoutes.map(r => ({ ...r, cex: true } as { cex: true } & Exchange))

    return { exchangesRoutes: res, isLoading }
}

function useExchangeDestinationRoutes({ direction, currencyGroup, networkTypes }: { direction: 'from' | 'to', currencyGroup: (ExchangeToken & { manuallySet?: boolean | undefined; }), networkTypes?: string[] }) {
    const apiClient = new LayerSwapApiClient()

    const assetGroupRoutesURL = useMemo(() => (
        resolveRoutesURLForSelectedAssetGroup(direction, currencyGroup, networkTypes)
    ), [direction, currencyGroup, networkTypes])

    const { data: apiResponse, isLoading } = useSWR<ApiResponse<NetworkRoute[]>>(
        assetGroupRoutesURL,
        apiClient.fetcher,
        { keepPreviousData: true, dedupingInterval: 10000 }
    )

    const [exchangesRoutes, setExchangesData] = useState<NetworkRoute[]>()

    useEffect(() => {
        if (!isLoading && apiResponse?.data) {
            setExchangesData(apiResponse.data)
        }
    }, [apiResponse, isLoading])

    return { exchangesRoutes, isLoading }
}