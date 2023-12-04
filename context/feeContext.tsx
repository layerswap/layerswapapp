import { useFormikContext } from 'formik';
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
    fee: {
        amount: number | undefined,
        usdAmount: number | undefined,
    }
    mutateFee: () => void,
    valuesChanger: (values:SwapFormValues) => void
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
        fee_amount: number,
        fee_price: number
    }>>((from && fromCurrency && to && toCurrency && amount) ?
        `/routes/rate/${from?.internal_name}/${fromCurrency?.asset}/${to?.internal_name}/${toCurrency?.asset}?amount=${amount}&version=sandbox` : null, apiClient.fetcher)

    const fee = {
        amount: lsFee?.data?.fee_amount,
        usdAmount: lsFee?.data?.fee_price
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
