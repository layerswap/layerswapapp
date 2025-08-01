import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { SwapFormValues } from '../components/DTOs/SwapFormValues'
import LayerSwapApiClient, { Quote, SwapBasicData } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'

type UseQuoteData = {
    minAllowedAmount?: number
    maxAllowedAmount?: number
    quote?: Quote
    isQuoteLoading: boolean
    mutateFee: () => void
    mutateLimits: () => void
}
type Props = {
    from: string | undefined
    to: string | undefined
    fromCurrency: string | undefined
    toCurrency: string | undefined
    amount: string | number | undefined
    refuel: boolean | undefined
    depositMethod: "wallet" | "deposit_address" | undefined
}

export function useQuoteData(formValues: Props | undefined): UseQuoteData {
    const { fromCurrency, toCurrency, from, to, amount, refuel, depositMethod } = formValues || {}
    const [debouncedAmount, setDebouncedAmount] = useState(amount)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedAmount(amount)
        }, 500)

        return () => clearTimeout(handler)
    }, [amount])

    const apiClient = new LayerSwapApiClient()
    const use_deposit_address = depositMethod === 'wallet' ? false : true

    const limitsURL = (from && to && depositMethod && toCurrency && fromCurrency) ?
        buildLimitsUrl({
            sourceNetwork: from!,
            sourceToken: fromCurrency!,
            destinationNetwork: to!,
            destinationToken: toCurrency!,
            useDepositAddress: use_deposit_address,
            refuel
        }) : null

    const { data: amountRange, mutate: mutateLimits } = useSWR<ApiResponse<{
        min_amount: number
        min_amount_in_usd: number
        max_amount: number
        max_amount_in_usd: number
    }>>(limitsURL, apiClient.fetcher, {
        refreshInterval: 20000,
        dedupingInterval: 20000,
    })

    const canGetQuote = from && to && depositMethod && toCurrency && fromCurrency
        && Number(debouncedAmount) > 0
        && (!amountRange || Number(debouncedAmount) >= (amountRange?.data?.min_amount || 0) && Number(debouncedAmount) <= (amountRange?.data?.max_amount || 0))

    const quoteURL = canGetQuote ?
        `/quote?source_network=${from}&source_token=${fromCurrency}&destination_network=${to}&destination_token=${toCurrency}&amount=${debouncedAmount}&refuel=${!!refuel}&use_deposit_address=${use_deposit_address}` : null

    const { data: quote, mutate: mutateFee, isLoading: isQuoteLoading, error: lsFeeError } = useSWR<ApiResponse<Quote>>(quoteURL, apiClient.fetcher, {
        refreshInterval: 42000,
        dedupingInterval: 42000,
    })


    return {
        minAllowedAmount: amountRange?.data?.min_amount,
        maxAllowedAmount: amountRange?.data?.max_amount,
        quote: quote?.data,
        isQuoteLoading,
        mutateFee,
        mutateLimits,
    }
}
export function transformFormValuesToQuoteArgs(values: SwapFormValues): Props | undefined {
    if (values.fromAsset?.status !== 'active' || values.toAsset?.status !== 'active') return undefined
    return {
        amount: values.amount,
        from: values.from?.name,
        depositMethod: values.depositMethod,
        fromCurrency: values.fromAsset?.symbol,
        to: values.to?.name,
        toCurrency: values.toAsset?.symbol,
        refuel: values.refuel
    }
}

export function transformSwapDataToQuoteArgs(swapData: SwapBasicData | undefined, refuel: boolean): Props | undefined {
    return {
        refuel,
        amount: swapData?.requested_amount,
        from: swapData?.source_network.name,
        depositMethod: swapData?.use_deposit_address ? 'deposit_address' : 'wallet',
        fromCurrency: swapData?.source_token.symbol,
        to: swapData?.destination_network.name,
        toCurrency: swapData?.destination_token.symbol,
    }
}

export const getLimits = async (swapValues: LimitsQueryOptions) => {
    const apiClient = new LayerSwapApiClient()
    const { sourceToken, sourceNetwork, destinationNetwork, destinationToken, refuel, useDepositAddress } = swapValues || {}

    if (!sourceNetwork || !destinationNetwork || !useDepositAddress || !destinationToken || !sourceToken)
        return { minAllowedAmount: undefined, maxAllowedAmount: undefined }

    const url = buildLimitsUrl({
        sourceNetwork,
        sourceToken,
        destinationNetwork,
        destinationToken,
        useDepositAddress,
        refuel
    })

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

interface LimitsQueryOptions {
    sourceNetwork?: string;
    sourceToken?: string;
    destinationNetwork?: string;
    destinationToken?: string;
    useDepositAddress?: boolean;
    refuel?: boolean;
}

export function buildLimitsUrl({
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    useDepositAddress,
    refuel = false
}: LimitsQueryOptions): string {

    if (!sourceNetwork || !sourceToken || !destinationNetwork || !destinationToken) {
        throw new Error("Invalid parameters for building limits URL");
    }

    const params = new URLSearchParams({
        source_network: sourceNetwork,
        source_token: sourceToken,
        destination_network: destinationNetwork,
        destination_token: destinationToken,
        use_deposit_address: useDepositAddress ? 'true' : 'false',
        refuel: String(!!refuel),
    });

    return `/limits?${params.toString()}`;
}