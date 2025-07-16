import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { SwapFormValues } from '../components/DTOs/SwapFormValues'
import LayerSwapApiClient, { Quote } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'

type UseQuoteData = {
    minAllowedAmount?: number
    maxAllowedAmount?: number
    quote?: Quote
    isQuoteLoading: boolean
    mutateFee: () => void
    mutateLimits: () => void
    updatePolling: (value: boolean) => void
}

export function useQuoteData(formValues: SwapFormValues): UseQuoteData {
    const { fromAsset: fromCurrency, toAsset: toCurrency, from, to, amount, refuel, depositMethod } = formValues || {}
    const [debouncedAmount, setDebouncedAmount] = useState(amount)
    const [poll, updatePolling] = useState(true)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedAmount(amount)
        }, 500)

        return () => clearTimeout(handler)
    }, [amount])

    const apiClient = new LayerSwapApiClient()
    const use_deposit_address = depositMethod === 'wallet' ? false : true

    const limitsURL = (from && fromCurrency?.status === "active" && to && toCurrency?.status === "active" && depositMethod) ?
        `/limits?source_network=${from?.name}&source_token=${fromCurrency?.symbol}&destination_network=${to?.name}&destination_token=${toCurrency?.symbol}&use_deposit_address=${use_deposit_address}&refuel=${!!refuel}` : null

    const { data: amountRange, mutate: mutateLimits } = useSWR<ApiResponse<{
        min_amount: number
        min_amount_in_usd: number
        max_amount: number
        max_amount_in_usd: number
    }>>(limitsURL, apiClient.fetcher, {
        refreshInterval: poll ? 20000 : 0,
    })

    const quoteURL = (from && fromCurrency?.status === "active" && to && toCurrency?.status === "active" && debouncedAmount && depositMethod) ?
        `/quote?source_network=${from?.name}&source_token=${fromCurrency?.symbol}&destination_network=${to?.name}&destination_token=${toCurrency?.symbol}&amount=${debouncedAmount}&refuel=${!!refuel}&use_deposit_address=${use_deposit_address}` : null

    const { data: quote, mutate: mutateFee, isLoading: isQuoteLoading, error: lsFeeError } = useSWR<ApiResponse<Quote>>(quoteURL, apiClient.fetcher, {
        refreshInterval: poll ? 2000 : 0,
    })

    return {
        minAllowedAmount: amountRange?.data?.min_amount,
        maxAllowedAmount: amountRange?.data?.max_amount,
        quote: quote?.data,
        isQuoteLoading,
        mutateFee,
        mutateLimits,
        updatePolling
    }
}