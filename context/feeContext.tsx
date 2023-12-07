import { createContext, useState, useContext } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { truncateDecimals } from '../components/utils/RoundDecimals';

const FeeStateContext = createContext<ContextType | null>(null);

type ContextType = {
    minAllowedAmount: number,
    maxAllowedAmount: number,
    fee: Fee,
    mutateFee: () => void,
    valuesChanger: (values: SwapFormValues) => void
}

export type Fee = {
    walletFee: number | undefined,
    manualFee: number | undefined,
    avgCompletionTime: {
        total_minutes: number,
        total_seconds: number,
        total_hours: number
    } | undefined;
}

export function FeeProvider({ children }) {

    const [values, setValues] = useState<SwapFormValues>()
    const { fromCurrency, toCurrency, from, to, amount } = values || {}

    const valuesChanger = (values: SwapFormValues) => {
        setValues(values)
    }

    const apiClient = new LayerSwapApiClient()

    const { data: amountRange } = useSWR<ApiResponse<{
        max_amount_in_usd: number,
        min_amount_in_usd: number
    }>>((from && fromCurrency && to && toCurrency) ?
        `/routes/limits/${from?.internal_name}/${fromCurrency?.asset}/${to?.internal_name}/${toCurrency?.asset}?version=sandbox` : null, apiClient.fetcher)

    const { data: lsFee, mutate: mutateFee } = useSWR<ApiResponse<{
        wallet_total_fee_in_usd: number,
        manual_fee_in_usd: number,
        avg_completion_time: {
            total_minutes: number,
            total_seconds: number,
            total_hours: number
        },
        fee_usd_price: number
    }>>((from && fromCurrency && to && toCurrency && amount) ?
        `/routes/rate/${from?.internal_name}/${fromCurrency?.asset}/${to?.internal_name}/${toCurrency?.asset}?amount=${amount}&version=sandbox` : null, apiClient.fetcher)

    const fee = {
        walletFee: Number(lsFee?.data?.wallet_total_fee_in_usd) / Number(lsFee?.data?.fee_usd_price),
        manualFee: Number(lsFee?.data?.manual_fee_in_usd) / Number(lsFee?.data?.fee_usd_price),
        avgCompletionTime: lsFee?.data?.avg_completion_time
    }

    const minAllowedAmount = truncateDecimals(Number(amountRange?.data?.min_amount_in_usd) / Number(fromCurrency?.usd_price), fromCurrency?.precision)
    const maxAllowedAmount = truncateDecimals(Number(amountRange?.data?.max_amount_in_usd) / Number(fromCurrency?.usd_price), fromCurrency?.precision)

    return (
        <FeeStateContext.Provider value={{ minAllowedAmount, maxAllowedAmount, fee, mutateFee, valuesChanger }}>
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
