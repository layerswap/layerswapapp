import { createContext, useState, useContext, useEffect } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { Quote } from '../lib/apiClients/layerSwapApiClient';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import sleep from '@/lib/wallets/utils/sleep';

const QuoteStateContext = createContext<ContextType | null>(null);

type ContextType = {
    minAllowedAmount: number | undefined,
    maxAllowedAmount: number | undefined,
    quote: Quote | undefined,
    mutateFee: () => void,
    mutateLimits: () => void,
    valuesChanger: (values: SwapFormValues) => void,
    formValues?: SwapFormValues,
    isQuoteLoading: boolean,
    updatePolling: (value: boolean) => void,
    isUpdatingValues: boolean,
}

export function QuoteProvider({ children }) {

    const [values, setValues] = useState<SwapFormValues>()
    const { fromAsset: fromCurrency, toAsset: toCurrency, from, to, amount, refuel, depositMethod } = values || {}
    const [debouncedAmount, setDebouncedAmount] = useState(amount);
    const [poll, updatePolling] = useState(true)


    const valuesChanger = (values: SwapFormValues) => {
        setValues(values)
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedAmount(amount);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [amount, 1000]);

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
        refreshInterval: poll ? 42000 : 0,
    })

    const [quoteData, setQuoteData] = useState<Quote | undefined>(undefined);
    const [isUpdatingValues, setIsUpdatingValues] = useState(false);

    useEffect(() => {
        (async () => {
            setIsUpdatingValues(true)
            await sleep(3000)
            setIsUpdatingValues(false)
            if (quote && quote.data && !lsFeeError) {
                setQuoteData(quote.data)
                return
            }
        })()
    }, [quote])

    return (
        <QuoteStateContext.Provider value={{
            minAllowedAmount: amountRange?.data?.min_amount,
            maxAllowedAmount: amountRange?.data?.max_amount,
            quote: quoteData,
            formValues: values,
            mutateFee,
            mutateLimits,
            valuesChanger,
            isQuoteLoading,
            updatePolling,
            isUpdatingValues
        }}>
            {children}
        </QuoteStateContext.Provider>
    )
}

export function useQuote() {
    const data = useContext(QuoteStateContext);

    if (data === null) {
        throw new Error('useQuote must be used within a QuoteProvider');
    }

    return data;
}
