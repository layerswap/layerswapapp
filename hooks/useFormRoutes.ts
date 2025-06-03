import useSWR from "swr";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { resolveExchangesURLForSelectedToken, resolveNetworkRoutesURL } from "../helpers/routes";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { ApiResponse } from "../Models/ApiResponse";
import { useEffect, useMemo, useState } from "react";
import { useSettingsState } from "../context/settings";
import { Exchange } from "../Models/Exchange";
import { RouteNetwork } from "../Models/Network";
import { RoutesGroup } from "../Models/Route";


type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
}

function useeDirectionRoutes({ direction, values }: Props) {
    const { networkRoutes, isLoading: networkRoutesLoading } = useNetworkRoutes({ direction, values })
    const { exchangesRoutes, isLoading: exchangesRoutesLoading } = useExchangeRoutes({ direction, values })


    const routes = useMemo(() => [...networkRoutes, ...exchangesRoutes], [networkRoutes, exchangesRoutes])
    const groupedRoutes = useMemo(() => groupRoutes(networkRoutes, exchangesRoutes, direction), [networkRoutes, exchangesRoutes, direction])

    const isLoading = networkRoutesLoading || exchangesRoutesLoading

    return { networkRoutes, exchangesRoutes, groupedRoutes, isLoading }

}

export default function useFormRoutes({ values }: Props) {
    const { from, fromCurrency, to, toCurrency, fromExchange, toExchange, currencyGroup } = values

    const {
        groupedRoutes: sourceGroups,
        networkRoutes: sourceNetworks,
        exchangesRoutes: sourceExchanges,
        isLoading: sourceLoading,
    } = useeDirectionRoutes({ direction: "from", values })

    const {
        groupedRoutes: destinationGroups,
        networkRoutes: destinationNetworks,
        exchangesRoutes: destinationExchanges,
        isLoading: destinationLoading,
    } = useeDirectionRoutes({ direction: "to", values })

    const sourceNetwork = useMemo(() => sourceNetworks.find(n => n.name === from), [sourceNetworks, from])
    const sourceToken = useMemo(() => sourceNetwork?.tokens.find(c => c.symbol === fromCurrency), [sourceNetwork, fromCurrency])

    const destinationNetwork = useMemo(() => destinationNetworks.find(n => n.name === to), [destinationNetworks, to])
    const destinationToken = useMemo(() => destinationNetwork?.tokens.find(c => c.symbol === toCurrency), [destinationNetwork, toCurrency])

    const sourceExchange = useMemo(() => sourceExchanges.find(n => n.name === fromExchange), [sourceExchanges, fromExchange])
    const destinationxchange = useMemo(() => destinationExchanges.find(n => n.name === toExchange), [toExchange, destinationExchanges])

    const exchangeToken = useMemo(() => sourceExchange?.token_groups.find(tg => tg.symbol === currencyGroup) || destinationxchange?.token_groups.find(tg => tg.symbol === currencyGroup), [sourceExchange, destinationxchange, currencyGroup])

    return {
        sourceGroups,
        destinationGroups,
        sourceNetwork,
        sourceToken,
        destinationNetwork,
        destinationToken,
        sourceExchange,
        destinationxchange,
        exchangeToken
    }
}

function useNetworkRoutes({ direction, values }: Props) {
    const { destinationRoutes, sourceRoutes } = useSettingsState();

    const networkRoutesURL = resolveNetworkRoutesURL(direction, values)
    const apiClient = new LayerSwapApiClient()
    const {
        data: apiResponse,
        isLoading
    } = useSWR<ApiResponse<RouteNetwork[]>>(networkRoutesURL, apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000 })

    const defaultData = (direction === 'from' ? sourceRoutes : destinationRoutes) || []
    const [networkRoutes, setRoutesData] = useState<(RouteNetwork)[]>(defaultData)

    useEffect(() => {
        if (!isLoading && apiResponse?.data) setRoutesData(apiResponse.data)
    }, [apiResponse])

    return { networkRoutes, isLoading }
}

function useExchangeRoutes({ direction, values }: Props) {
    const { sourceExchanges, destinationExchanges } = useSettingsState();

    const apiClient = new LayerSwapApiClient()
    const exchangeRoutesURL = resolveExchangesURLForSelectedToken(direction, values)
    const {
        data: apiResponse,
        isLoading,
    } = useSWR<ApiResponse<Exchange[]>>(exchangeRoutesURL, apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000 })

    const defaultData = (direction === 'from' ? sourceExchanges : destinationExchanges) || []
    const [exchangesRoutes, setExchangesData] = useState<Exchange[]>(defaultData)

    useEffect(() => {
        if (!isLoading && apiResponse?.data) setExchangesData(apiResponse.data)
    }, [apiResponse])

    return { exchangesRoutes, isLoading }
}

function resolvePopularRoutes(routes: RouteNetwork[], direction: SwapDirection) {
    return routes.filter(r => r.tokens?.some(r => r.status === 'active'))
        .sort((a, b) =>
        (direction === "from"
            ? (a.source_rank ?? 0) - (b.source_rank ?? 0)
            : (a.destination_rank ?? 0) - (b.destination_rank ?? 0))
        )
        .slice(0, 5)
        .map(r => r.name) || []
}

function groupRoutes(networkRoutes: RouteNetwork[], exchangesRoutes: Exchange[], direction: SwapDirection): RoutesGroup[] {
    const popularRoutes = resolvePopularRoutes(networkRoutes, direction)

    let groups: RoutesGroup[] = [{
        name: "Popular",
        routes: networkRoutes.filter(r => popularRoutes?.includes(r.name))
    }, {
        name: "All Networks",
        routes: networkRoutes.filter(r => !popularRoutes?.includes(r.name))
    }, {
        name: "Exchanges",
        routes: exchangesRoutes.map(e => ({ ...e, cex: true }))
    }]

    return groups;
}