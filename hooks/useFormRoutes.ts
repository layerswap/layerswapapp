import useSWR from "swr";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { resolveExchangesURLForSelectedToken, resolveNetworkRoutesURL } from "../helpers/routes";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { ApiResponse } from "../Models/ApiResponse";
import { NetworkRoute } from "../Models/Network";
import { useEffect, useMemo, useState } from "react";
import { useSettingsState } from "../context/settings";
import { Exchange } from "../Models/Exchange";
import { NetworkElement, RowElement, RoutesGroup, NetworkTokenElement, _Route, _RoutesGroup, ExchangeTokenElement, ExchangeElement, TitleElement } from "../Models/Route";
import useAllBalances from "./useAllBalances";
import { NetworkBalance } from "../Models/Balance";

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
}

export default function useFormRoutes({ direction, values }: Props, search?: string) {
    const { networkRoutes, isLoading: networkRoutesLoading } = useNetworkRoutes({ direction, values })
    const { exchangesRoutes, isLoading: exchangesRoutesLoading } = useExchangeRoutes({ direction, values })

    const allRoutes = useMemo(() => {
        return [...networkRoutes, ...exchangesRoutes]
    }, [networkRoutes, exchangesRoutes])

    const isLoading = networkRoutesLoading || exchangesRoutesLoading

    const balances = useAllBalances({ direction })

    const routeElements = useMemo(() => groupRoutes(networkRoutes, exchangesRoutes, direction, balances, search), [networkRoutes, exchangesRoutes, balances, direction, search])

    const selectedRoute = useMemo(() => resolveSelectedRoute(values, direction), [values, direction])
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction])
    const allbalancesLoaded = useMemo(() => !!balances, [balances])
    const res = useMemo(() => {
        return ({ allRoutes, isLoading, routeElements, selectedRoute, selectedToken, allbalancesLoaded })
    }, [
        allRoutes,
        isLoading,
        routeElements,
        selectedRoute,
        selectedToken,
        allbalancesLoaded
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
    const [networkRoutes, setRoutesData] = useState<({ cex?: false } & NetworkRoute)[]>(defaultData)

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


function groupRoutes(networkRoutes: NetworkRoute[], exchangesRoutes: ({ cex: true } & Exchange)[], direction: SwapDirection, balances: Record<string, NetworkBalance> | null, search?: string): RowElement[] {
    if (search) {
        const networks = networkRoutes.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map((r): NetworkElement => ({ type: 'network', route: { ...r, cex: false } })).sort((a, b) => (balances?.[a.route.name]?.totalInUSD || 0) - (balances?.[b.route.name]?.totalInUSD || 0))
        const networkrksTitle: TitleElement[] = networks.length > 0 ? [{
            type: 'group_title',
            text: "Networks"
        }] : []

        const networktokens = networkRoutes.flatMap(r => r.tokens?.filter(t => t.symbol.toLowerCase().includes(search.toLowerCase())).map((t): NetworkTokenElement => ({ type: 'network_token', route: { token: t, route: { ...r, cex: false } } })) || [])
        const exchangeTokens = exchangesRoutes.flatMap(r => r.token_groups?.filter(t => t.symbol.toLowerCase().includes(search.toLowerCase())).map((t): ExchangeTokenElement => ({ type: 'exchange_token', route: { token: t, route: { ...r, cex: true } } })) || [])
        const tokensTitle: TitleElement[] = (networks.length > 0 || exchangeTokens.length > 0) ? [{
            type: 'group_title',
            text: "Tokens"
        }] : []

        const exchanges = exchangesRoutes.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map((r): ExchangeElement => ({ type: 'exchange', route: { ...r, cex: true } }))
        const exchangesTitle: TitleElement[] = exchanges.length > 0 ? [{
            type: 'group_title',
            text: "Exchanges"
        }] : []

        return [
            ...networkrksTitle,
            ...networks,
            ...tokensTitle,
            ...networktokens,
            ...exchangeTokens,
            ...exchangesTitle,
            ...exchanges,
        ]
    }

    const popularRoutes = resolvePopularRoutes(networkRoutes, direction)

    const popularNetworks = networkRoutes.filter(r => popularRoutes?.includes(r.name)).map((r): NetworkElement => ({ type: 'network', route: { ...r, cex: false } })).sort((a, b) => (balances?.[b.route.name]?.totalInUSD || 0) - (balances?.[a.route.name]?.totalInUSD || 0))
    const popularesTitle: TitleElement[] = popularNetworks.length > 0 ? [{
        type: 'group_title',
        text: "Popular"
    }] : []

    const networks = networkRoutes.filter(r => !popularRoutes?.includes(r.name)).map((r): NetworkElement => ({ type: 'network', route: { ...r, cex: false } })).sort((a, b) => (balances?.[b.route.name]?.totalInUSD || 0) - (balances?.[a.route.name]?.totalInUSD || 0))
    const networksTitle: TitleElement[] = networks.length > 0 ? [{
        type: 'group_title',
        text: "All Networks"
    }] : []

    const exchanges = exchangesRoutes.map((r): ExchangeElement => ({ type: 'exchange', route: { ...r, cex: true } }))
    const exchangesTitle: TitleElement[] = exchanges.length > 0 ? [{
        type: 'group_title',
        text: "Exchanges"
    }] : []


    return [
        ...popularesTitle,
        ...popularNetworks,
        ...networksTitle,
        ...networks,
        ...exchangesTitle,
        ...exchanges,
    ]
}

function resolveSelectedRoute(values: SwapFormValues, direction: SwapDirection): NetworkRoute | Exchange | undefined {
    const { from, to, fromExchange, toExchange } = values
    return direction === 'from' ? fromExchange || from : toExchange || to;
}
function resolveSelectedToken(values: SwapFormValues, direction: SwapDirection) {
    const { fromCurrency, toCurrency, fromExchange, toExchange } = values
    //TODO: might need model refactoring as for now we just assume if exchange is selected then token is curencyGroup
    if ((direction === 'from' && fromExchange) || (direction === 'to' && toExchange)) {
        return values.currencyGroup
    }
    else
        return direction === 'from' ? fromCurrency : toCurrency;
}