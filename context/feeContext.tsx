import { createContext, useState, useContext, useEffect } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';

const FeeStateContext = createContext<ContextType | null>(null);

type ContextType = {
    minAllowedAmount: number | undefined,
    maxAllowedAmount: number | undefined,
    fee: Fee,
    mutateFee: () => void,
    valuesChanger: (values: SwapFormValues) => void,
    isFeeLoading: boolean
}

export type Fee = {
    walletFee: number | undefined,
    manualFee: number | undefined,
    avgCompletionTime: {
        total_minutes: number,
        total_seconds: number,
        total_hours: number
    } | undefined;
    walletReceiveAmount: number | undefined,
    manualReceiveAmount: number | undefined
}

export function FeeProvider({ children }) {

    const [values, setValues] = useState<SwapFormValues>()
    const { fromCurrency, toCurrency, from, to, amount, refuel } = values || {}
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
    const version = LayerSwapApiClient.apiVersion

    const { data: amountRange } = useSWR<ApiResponse<{
        manual_min_amount: number
        manual_min_amount_in_usd: number
        max_amount: number
        max_amount_in_usd: number
        wallet_min_amount: number
        wallet_min_amount_in_usd: number
    }>>((from && fromCurrency && to && toCurrency) ?
        `/routes/limits/${from?.internal_name}/${fromCurrency?.asset}/${to?.internal_name}/${toCurrency?.asset}?version=${version}&refuel=${!!refuel}` : null, apiClient.fetcher, {
        refreshInterval: 10000,
    })

    const { data: lsFee, mutate: mutateFee, isLoading: isFeeLoading } = useSWR<ApiResponse<{
        wallet_fee_in_usd: number,
        wallet_fee: number,
        wallet_receive_amount: number,
        manual_fee_in_usd: number,
        manual_fee: number,
        manual_receive_amount: number,
        avg_completion_time: {
            total_minutes: number,
            total_seconds: number,
            total_hours: number
        },
        fee_usd_price: number
    }>>((from && fromCurrency && to && toCurrency && debouncedAmount) ?
        `/routes/rate/${from?.internal_name}/${fromCurrency?.asset}/${to?.internal_name}/${toCurrency?.asset}?amount=${debouncedAmount}&version=${version}` : null, apiClient.fetcher, { refreshInterval: 10000 })

    const fee = {
        walletFee: lsFee?.data?.wallet_fee,
        manualFee: lsFee?.data?.manual_fee,
        walletReceiveAmount: lsFee?.data?.wallet_receive_amount,
        manualReceiveAmount: lsFee?.data?.manual_receive_amount,
        avgCompletionTime: lsFee?.data?.avg_completion_time
    }

    return (
        <FeeStateContext.Provider value={{ minAllowedAmount: amountRange?.data?.manual_min_amount, maxAllowedAmount: amountRange?.data?.max_amount, fee, mutateFee, valuesChanger, isFeeLoading }}>
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
