import useSWR from "swr";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { resolveExchangesURLForSelectedToken, resolveNetworkRoutesURL } from "../helpers/routes";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { ApiResponse } from "../Models/ApiResponse";
import { NetworkRoute } from "../Models/Network";
import { useEffect, useMemo, useState } from "react";
import { useSettingsState } from "../context/settings";
import { Exchange } from "../Models/Exchange";
import { NetworkElement, RowElement, NetworkTokenElement, _Route, _RoutesGroup, TitleElement, GroupTokensResult } from "../Models/Route";
import useAllBalances from "./useAllBalances";
import { NetworkBalance } from "../Models/Balance";

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
}

export default function useFormRoutes({ direction, values }: Props, search?: string) {
    const { networkRoutes, isLoading: networkRoutesLoading } = useNetworkRoutes({ direction, values })

    const allRoutes = useMemo(() => {
        return [...networkRoutes]
    }, [networkRoutes])

    const isLoading = networkRoutesLoading

    const balances = useAllBalances({ direction })

    const routeElements = useMemo(() => groupRoutes(networkRoutes, direction, balances, search), [networkRoutes, balances, direction, search])
    const tokenElements = useMemo(() => groupTokens(networkRoutes, search), [networkRoutes, search]);

    const selectedRoute = useMemo(() => resolveSelectedRoute(values, direction), [values, direction])
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction])
    const allbalancesLoaded = useMemo(() => !!balances, [balances])
    const res = useMemo(() => {
        return ({ allRoutes, isLoading, routeElements, tokenElements, selectedRoute, selectedToken, allbalancesLoaded })
    }, [
        allRoutes,
        isLoading,
        routeElements,
        tokenElements,
        selectedRoute,
        selectedToken,
        allbalancesLoaded,
    ])

    return res
}

function useNetworkRoutes({ direction, values }: Props) {
    const { destinationRoutes, sourceRoutes } = useSettingsState();

    const networkRoutesURL = useMemo(() => resolveNetworkRoutesURL(direction, values), [direction, values])
    const apiClient = new LayerSwapApiClient()
    const {
        data: apiResponse,
        isLoading
    } = useSWR<ApiResponse<NetworkRoute[]>>(networkRoutesURL, apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000 })

    const defaultData = (direction === 'from' ? sourceRoutes : destinationRoutes) || []
    const [networkRoutes, setRoutesData] = useState<NetworkRoute[]>(defaultData)

    useEffect(() => {
        if (!isLoading && apiResponse?.data) setRoutesData(apiResponse.data)
    }, [apiResponse])

    return useMemo(() => ({ networkRoutes, isLoading }), [networkRoutes, isLoading])
}

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

function resolvePopularRoutes(routes: NetworkRoute[], direction: SwapDirection) {
    return routes.filter(r => r.tokens?.some(r => r.status === 'active'))
        .sort((a, b) =>
        (direction === "from"
            ? (a.source_rank ?? 0) - (b.source_rank ?? 0)
            : (a.destination_rank ?? 0) - (b.destination_rank ?? 0))
        )
        .slice(0, 5)
        .map(r => r.name) || []
}

function groupRoutes(networkRoutes: NetworkRoute[], direction: SwapDirection, balances: Record<string, NetworkBalance> | null, search?: string): RowElement[] {
    if (search) {
        const networks = networkRoutes.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map((r): NetworkElement => ({ type: 'network', route: { ...r } })).sort((a, b) => (balances?.[a.route.name]?.totalInUSD || 0) - (balances?.[b.route.name]?.totalInUSD || 0))
        const networksTitle: TitleElement[] = networks.length > 0 ? [{
            type: 'group_title',
            text: "Networks"
        }] : []

        const networktokens = networkRoutes.flatMap(r => r.tokens?.filter(t => t.symbol.toLowerCase().includes(search.toLowerCase())).map((t): NetworkTokenElement => ({ type: 'network_token', route: { token: t, route: { ...r } } })) || [])
        const tokensTitle: TitleElement[] = networks.length > 0 ? [{
            type: 'group_title',
            text: "Tokens"
        }] : []

        return [
            ...networksTitle,
            ...networks,
            ...tokensTitle,
            ...networktokens,
        ]
    }

    const popularRoutes = direction === 'to' ? resolvePopularRoutes(networkRoutes, direction) : []

    const popularNetworks: NetworkElement[] = direction === 'to'
        ? networkRoutes
            .filter(r => resolvePopularRoutes(networkRoutes, direction)?.includes(r.name))
            .map((r): NetworkElement => ({ type: 'network', route: { ...r } }))
            .sort((a, b) => (balances?.[b.route.name]?.totalInUSD || 0) - (balances?.[a.route.name]?.totalInUSD || 0))
        : []

    const popularesTitle: TitleElement[] = direction === 'to' && popularNetworks.length > 0 ? [{
        type: 'group_title',
        text: "Popular"
    }] : []

    const unsortedNetworks = networkRoutes.filter(r => !popularRoutes?.includes(r.name)).map((r): NetworkElement => ({ type: 'network', route: { ...r } }));
    const networks = direction === 'to'
        ? unsortedNetworks
        : unsortedNetworks.sort((a, b) => (balances?.[b.route.name]?.totalInUSD || 0) - (balances?.[a.route.name]?.totalInUSD || 0));
    const networksTitle: TitleElement[] = networks.length > 0 ? [{
        type: 'group_title',
        text: "All Networks"
    }] : []

    return [
        ...popularesTitle,
        ...popularNetworks,
        ...networksTitle,
        ...networks,
    ]
}

function groupTokens(
    networkRoutes: NetworkRoute[],
    search?: string
): GroupTokensResult {
    if (search) {
        const lowered = search.toLowerCase();

        const networks: NetworkElement[] = networkRoutes
            .filter(r => r.name.toLowerCase().includes(lowered))
            .map(r => ({ type: 'network', route: { ...r } }));

        const networkTokens: NetworkTokenElement[] = networkRoutes.flatMap(r =>
            (r.tokens || [])
                .filter(t => t.symbol.toLowerCase().includes(lowered))
                .map(t => ({
                    type: 'network_token',
                    route: { token: t, route: { ...r } }
                }))
        );

        return [
            ...networks,
            ...networkTokens,
        ];
    }

    const tokenMap: Record<string, NetworkTokenElement[]> = {};

    for (const network of networkRoutes) {
        for (const token of network.tokens || []) {
            const item: NetworkTokenElement = {
                type: 'network_token',
                route: { token, route: { ...network } },
            };
            tokenMap[token.symbol] = tokenMap[token.symbol] || [];
            tokenMap[token.symbol].push(item);
        }
    }

    return Object.entries(tokenMap).map(([symbol, items]) => ({
        type: 'grouped_token',
        symbol,
        items,
    }));
}


function resolveSelectedRoute(values: SwapFormValues, direction: SwapDirection): NetworkRoute | undefined {
    const { from, to } = values
    return direction === 'from' ? from : to;
}
function resolveSelectedToken(values: SwapFormValues, direction: SwapDirection) {
    const { fromCurrency, toCurrency } = values

    return direction === 'from' ? fromCurrency : toCurrency;
}