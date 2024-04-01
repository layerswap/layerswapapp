import { createContext, useState, useContext, useEffect } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { Quote } from '../lib/layerSwapApiClient';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';

const FeeStateContext = createContext<ContextType | null>(null);

type ContextType = {
    minAllowedAmount: number | undefined,
    maxAllowedAmount: number | undefined,
    fee: Quote | undefined,
    mutateFee: () => void,
    valuesChanger: (values: SwapFormValues) => void,
    isFeeLoading: boolean
}

export function FeeProvider({ children }) {

    const [values, setValues] = useState<SwapFormValues>()
    const [cachedRateData, setCachedRateData] = useState<Quote>()

    const { fromCurrency, toCurrency, from, to, amount, refuel, depositMethod, destination_address } = values || {}
    const [debouncedAmount, setDebouncedAmount] = useState(amount);

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

    const { data: amountRange } = useSWR<ApiResponse<{
        min_amount: number
        min_amount_in_usd: number
        max_amount: number
        max_amount_in_usd: number
    }>>((from && fromCurrency && to && toCurrency && depositMethod) ?
        `/limits?source_network=${from?.name}&source_token=${fromCurrency?.symbol}&destination_network=${to?.name}&destination_token=${toCurrency?.symbol}&deposit_mode=${depositMethod}&refuel=${!!refuel}` : null, apiClient.fetcher, {
        refreshInterval: 10000
    })

    const { data: lsFee, mutate: mutateFee, isLoading: isFeeLoading } = useSWR<ApiResponse<Quote>>((from && fromCurrency && to && toCurrency && debouncedAmount && depositMethod && destination_address) ?
        `/quote?source_network=${from?.name}&source_token=${fromCurrency?.symbol}&destination_network=${to?.name}&destination_token=${toCurrency?.symbol}&amount=${debouncedAmount}&refuel=${!!refuel}&deposit_mode=${depositMethod}` : null, apiClient.fetcher, {
        refreshInterval: 10000,
        fallbackData: { data: cachedRateData }
    })

    useEffect(() => {
        setCachedRateData(lsFee?.data)
    }, [lsFee])

    return (
        <FeeStateContext.Provider value={{ minAllowedAmount: amountRange?.data?.min_amount, maxAllowedAmount: amountRange?.data?.max_amount, fee: lsFee?.data, mutateFee, valuesChanger, isFeeLoading }}>
            {children}
        </FeeStateContext.Provider>
    )
}

export function useFee() {
    const data = useContext(FeeStateContext);

    if (data === null) {
        throw new Error('useFee must be used within a FeeProvider');
    }

    return data;
}
