import useSWR from "swr";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { resolveExchangesURLForSelectedToken, resolveNetworkRoutesURL } from "../helpers/routes";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { ApiResponse } from "../Models/ApiResponse";
import { NetworkRoute } from "../Models/Network";
import { useEffect, useMemo, useState } from "react";
import { useSettingsState } from "../context/settings";
import { Exchange } from "../Models/Exchange";
import { RoutesGroup } from "../Models/Route";

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
}

export default function useFormRoutes({ direction, values }: Props) {
    const { networkRoutes, isLoading: networkRoutesLoading } = useNetworkRoutes({ direction, values })
    const { exchangesRoutes, isLoading: exchangesRoutesLoading } = useExchangeRoutes({ direction, values })

    const allRoutes = useMemo(() => [...networkRoutes, ...exchangesRoutes], [networkRoutes, exchangesRoutes])
    const groupedRoutes = useMemo(() => groupRoutes(networkRoutes, exchangesRoutes, direction), [networkRoutes, exchangesRoutes, direction])

    const isLoading = networkRoutesLoading || exchangesRoutesLoading

    return { allRoutes, isLoading, groupedRoutes }
}

function useNetworkRoutes({ direction, values }: Props) {
    const { destinationRoutes, sourceRoutes } = useSettingsState();

    const networkRoutesURL = resolveNetworkRoutesURL(direction, values)
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

    return { exchangesRoutes: exchangesRoutes.map(r => ({ ...r, cex: true } as { cex: true } & Exchange)), isLoading }
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

function groupRoutes(networkRoutes: NetworkRoute[], exchangesRoutes: ({ cex: true } & Exchange)[], direction: SwapDirection): RoutesGroup[] {
    const popularRoutes = resolvePopularRoutes(networkRoutes, direction)

    let groups: RoutesGroup[] = [{
        name: "Popular",
        routes: networkRoutes.filter(r => popularRoutes?.includes(r.name))
    }, {
        name: "All Networks",
        routes: networkRoutes.filter(r => !popularRoutes?.includes(r.name))
    }, {
        name: "Exchanges",
        routes: exchangesRoutes
    }]

    return groups;
}