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
        `/limits?source_network=${from}&source_token=${fromCurrency}&destination_network=${to}&destination_token=${toCurrency}&use_deposit_address=${use_deposit_address}&refuel=${!!refuel}` : null

    const { data: amountRange, mutate: mutateLimits } = useSWR<ApiResponse<{
        min_amount: number
        min_amount_in_usd: number
        max_amount: number
        max_amount_in_usd: number
    }>>(limitsURL, apiClient.fetcher, {
        refreshInterval: 20000,
        dedupingInterval: 20000,
    })

    const quoteURL = (from && to && Number(debouncedAmount) > 0 && depositMethod && toCurrency && fromCurrency) ?
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

