import useSWR from "swr";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { resolveExchangeHistoricalNetworksURL } from "../helpers/routes";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { ApiResponse } from "../Models/ApiResponse";
import { ExchangeNetwork } from "../Models/Exchange";
import { use, useMemo } from "react";

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
}

export default function useExchangeNetworks({ direction, values }: Props) {
    const exchangeNetworksURL = resolveExchangeHistoricalNetworksURL(direction, values)

    const apiClient = new LayerSwapApiClient()
    const {
        data: apiResponse,
        isLoading
    } = useSWR<ApiResponse<ExchangeNetwork[]>>(exchangeNetworksURL, apiClient.fetcher,
        {
            keepPreviousData: true,
            dedupingInterval: 10000,
            revalidateIfStale: false
        })
    //As the response does not give the statuses and it does not include not active tokens, we can assume all are active
    const networks = useMemo(() => (apiResponse?.data?.map(n => ({ ...n, token: { ...n.token, status: "active" as "active" } }))), [apiResponse])
    return { networks, isLoading }
}
