import useSWR from "swr";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { resolveExchangeHistoricalNetworksURL } from "@/helpers/routes";
import { ApiResponse } from "@/Models/ApiResponse";
import { ExchangeNetwork } from "@/Models/Exchange";
import { useMemo } from "react";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";

type Props = {
    values: SwapFormValues;
}

export default function useExchangeNetworks({ values }: Props) {
    const exchangeNetworksURL = resolveExchangeHistoricalNetworksURL('from', values)

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
