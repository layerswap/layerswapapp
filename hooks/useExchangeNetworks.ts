import useSWR from "swr";
import { resolveExchangeHistoricalNetworksURL } from "@/helpers/routes";
import { ApiResponse } from "@/Models/ApiResponse";
import { ExchangeNetwork } from "@/Models/Exchange";
import { useMemo } from "react";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";

type Props = {
    fromExchange?: string | undefined;
    to?: string | undefined;
    toAsset?: string | undefined;
}

export default function useExchangeNetworks({ fromExchange, to, toAsset }: Props) {
    const exchangeNetworksURL = resolveExchangeHistoricalNetworksURL("from", { fromExchange, to, toAsset });

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