import useSWR from 'swr'
import LayerSwapApiClient from '@/lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '@/Models/ApiResponse'
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'

export type DetailedQuoteRoute = {
    id: number
    service_fee_in_source: number
    service_fee_in_usd: number
    service_fee_percentage: number
    expense_in_source: number
    expense_fee_in_usd: number
    expense_fee_percentage: number
    fee_in_source: number
    fee_in_usd: number
    avg_completion_milliseconds: number
    provider_name: string
    order: number
}

export type DetailedQuoteModel = {
    avg_completion_milliseconds: number
    min_amount: number
    min_amount_in_usd: number
    max_amount: number
    max_amount_in_usd: number
    fee_amount_for_min: number
    fee_amount_for_max: number
    total_percentage_fee: number
    total_fixed_fee_in_usd: number
    total_fixed_fee_in_source: number
    path: DetailedQuoteRoute[]
}

type DetailedQuoteArgs = {
    sourceNetwork: string | undefined
    sourceToken: string | undefined
    destinationNetwork: string | undefined
    destinationToken: string | undefined
    destinationAddress: string | undefined
    refuel?: boolean
    useDepositAddress?: boolean
}

function buildDetailedQuoteUrl(args: DetailedQuoteArgs): string | null {
    const { sourceNetwork, sourceToken, destinationNetwork, destinationToken, destinationAddress } = args
    if (!sourceNetwork || !sourceToken || !destinationNetwork || !destinationToken || !destinationAddress) {
        return null
    }

    const params = new URLSearchParams({
        source_network: sourceNetwork,
        source_token: sourceToken,
        destination_network: destinationNetwork,
        destination_token: destinationToken,
        destination_address: destinationAddress,
        refuel: String(!!args.refuel),
        use_deposit_address: 'true',
    })

    return `/detailed_quote?${params.toString()}`
}

export function transformFormValuesToDetailedQuoteArgs(values: SwapFormValues): DetailedQuoteArgs {
    return {
        sourceNetwork: values.from?.name,
        sourceToken: values.fromAsset?.symbol,
        destinationNetwork: values.to?.name,
        destinationToken: values.toAsset?.symbol,
        destinationAddress: values.destination_address || undefined,
        refuel: values.refuel,
        useDepositAddress: true,
    }
}

export function useDetailedQuote(args: DetailedQuoteArgs, refreshInterval?: number) {
    const apiClient = new LayerSwapApiClient()
    const url = buildDetailedQuoteUrl(args)

    const { data, error, isLoading, mutate } = useSWR<ApiResponse<DetailedQuoteModel[]>>(
        url,
        apiClient.fetcher,
        {
            refreshInterval: refreshInterval ?? 30000,
            dedupingInterval: 5000,
        }
    )

    const bestQuote = data?.data?.[0]

    return {
        detailedQuotes: data?.data,
        bestQuote,
        isLoading,
        error,
        mutate,
    }
}
