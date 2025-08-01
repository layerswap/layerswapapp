import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient"
import { SwapFormValues } from "../DTOs/SwapFormValues"
import { ApiResponse } from "@/Models/ApiResponse"
import { transformFormValuesToQuoteArgs } from "@/hooks/useFee"

export async function getLimits(swapValues: SwapFormValues) {
    const apiClient = new LayerSwapApiClient()
    const quoteArgs = transformFormValuesToQuoteArgs(swapValues)
    const { fromCurrency, toCurrency, from, to, refuel, depositMethod } = quoteArgs || {}

    if (!from || !to || !depositMethod || !toCurrency || !fromCurrency)
        return { minAllowedAmount: undefined, maxAllowedAmount: undefined }

    const url = `/limits?source_network=${from}&source_token=${fromCurrency}&destination_network=${to}&destination_token=${toCurrency}&use_deposit_address=${depositMethod === "wallet" ? false : true}&refuel=${!!refuel}`

    const response = await apiClient.fetcher(url) as ApiResponse<{
        min_amount: number
        max_amount: number
        min_amount_in_usd: number
        max_amount_in_usd: number
    }>

    return {
        minAllowedAmount: response?.data?.min_amount,
        maxAllowedAmount: response?.data?.max_amount
    }
}