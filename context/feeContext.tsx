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
    isFeeLoading: boolean,
    updatePolling: (value: boolean) => void
}

export function FeeProvider({ children }) {

    const [values, setValues] = useState<SwapFormValues>()
    const [cachedRateData, setCachedRateData] = useState<Quote>()
    const { fromCurrency, toCurrency, from, to, amount, refuel, depositMethod, destination_address } = values || {}
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

    const { data: amountRange } = useSWR<ApiResponse<{
        min_amount: number
        min_amount_in_usd: number
        max_amount: number
        max_amount_in_usd: number
    }>>((from && fromCurrency && to && toCurrency && depositMethod) ?
        `/limits?source_network=${from?.name}&source_token=${fromCurrency?.symbol}&destination_network=${to?.name}&destination_token=${toCurrency?.symbol}&use_deposit_address=${use_deposit_address}&refuel=${!!refuel}` : null, apiClient.fetcher, {
        refreshInterval: poll ? 20000 : 0,
    })

    const { data: lsFee, mutate: mutateFee, isLoading: isFeeLoading } = useSWR<ApiResponse<Quote>>((from && fromCurrency && to && toCurrency && debouncedAmount && depositMethod) ?
        `/quote?source_network=${from?.name}&source_token=${fromCurrency?.symbol}&destination_network=${to?.name}&destination_token=${toCurrency?.symbol}&amount=${debouncedAmount}&refuel=${!!refuel}&use_deposit_address=${use_deposit_address}` : null, apiClient.fetcher, {
        refreshInterval: poll ? 42000 : 0,
        fallbackData: { data: cachedRateData }
    })

    useEffect(() => {
        setCachedRateData(lsFee?.data)
    }, [lsFee])

    return (
        <FeeStateContext.Provider value={{
            minAllowedAmount: amountRange?.data?.min_amount,
            maxAllowedAmount: amountRange?.data?.max_amount,
            fee: lsFee?.data,
            mutateFee,
            valuesChanger,
            isFeeLoading,
            updatePolling
        }}>
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
