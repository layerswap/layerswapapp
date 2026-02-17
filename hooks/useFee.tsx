import { useCallback, useEffect, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { SwapFormValues } from '../components/DTOs/SwapFormValues'
import LayerSwapApiClient, { Quote, SwapBasicData } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'
import { sleep } from 'fuels'
import { create } from 'zustand';
import { isDiffByPercent } from '@/components/utils/numbers'
import { useSlippageStore } from '@/stores/slippageStore'

type UseQuoteData = {
    minAllowedAmount?: number
    maxAllowedAmount?: number
    minAllowedAmountInUsd?: number
    maxAllowedAmountInUsd?: number
    quote?: Quote
    quoteError?: QuoteError
    isQuoteLoading: boolean
    isDebouncing: boolean
    mutateFee: () => void
    mutateLimits: () => void
    limitsValidating: boolean
}
export type QuoteError = {
    code: string;
    message: string;
    response?: {
        data?: {
            error?: {
                code?: string;
                message?: string;
                metadata?: {
                    AmountLimit: number
                }
            }
        };
    }
    metadata?: {
        StatusCode?: string;
        [key: string]: any;
    }
}

type Props = {
    from: string | undefined
    to: string | undefined
    fromCurrency: string | undefined
    toCurrency: string | undefined
    amount: string | number | undefined
    refuel: boolean | undefined
    depositMethod: "wallet" | "deposit_address" | undefined
    withDelay?: boolean
}

export function useQuoteData(formValues: Props | undefined, refreshInterval?: number): UseQuoteData {
    const { fromCurrency, toCurrency, from, to, amount, refuel, depositMethod } = formValues || {}
    const [debouncedAmount, setDebouncedAmount] = useState(amount)
    const [isDebouncing, setIsDebouncing] = useState(false)
    const { slippage } = useSlippageStore()
    useEffect(() => {
        if (amount === debouncedAmount) {
            setIsDebouncing(false)
            return;
        }

        setIsDebouncing(true)
        const handler = setTimeout(() => {
            setDebouncedAmount(amount)
            setIsDebouncing(false)
        }, 300)

        return () => {
            clearTimeout(handler)
        }
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

    const { data: amountRange, mutate: mutateLimits, isValidating: limitsValidating } = useSWR<ApiResponse<{
        min_amount: number
        min_amount_in_usd: number
        max_amount: number
        max_amount_in_usd: number
    }>>(limitsURL, apiClient.fetcher, {
        refreshInterval: (refreshInterval || refreshInterval == 0) ? refreshInterval : 20000,
        dedupingInterval: 5000
    })

    const canGetQuote = from && to && depositMethod && toCurrency && fromCurrency && debouncedAmount

    const quoteURL = (canGetQuote && !isDebouncing)
        ? buildQuoteUrl({
            sourceNetwork: from!,
            sourceToken: fromCurrency!,
            destinationNetwork: to!,
            destinationToken: toCurrency!,
            amount: debouncedAmount!,
            refuel: !!refuel,
            useDepositAddress: use_deposit_address,
            slippage,
        })
        : null

    const { cache } = useSWRConfig();
    const isQuoteLoading = useLoadingStore((state) => state.isLoading);
    //TODO: implement middleware that handles the delay logic
    const quoteFetchWrapper = useCallback(async (url: string): Promise<ApiResponse<Quote>> => {
        const { setLoading, key, setKey } = useLoadingStore.getState()
        try {
            if (key !== url) {
                setLoading(true)
            }

            const previousData = cache.get(url)?.data as ApiResponse<Quote>
            const newData = await apiClient.fetcher(url) as ApiResponse<Quote>
            if (previousData?.data?.quote && isDiffByPercent(previousData?.data?.quote.receive_amount, newData.data?.quote.receive_amount, 2)) {
                const { setLoading } = useLoadingStore.getState()
                setLoading(true)
                await sleep(3500)
            }


            setKey(url)
            setLoading(false)
            return newData
        }
        catch (error) {
            if (error.response?.data?.error?.code === "VALIDATION_ERROR") {
                useSlippageStore.getState().clearSlippage()
            }
            setLoading(false)
            setKey(null)
            throw error
        }
    }, [cache])

    const { data: quote, mutate: mutateFee, error: quoteError } = useSWR<ApiResponse<Quote>>(quoteURL, quoteFetchWrapper, {
        refreshInterval: (refreshInterval || refreshInterval == 0) ? refreshInterval : 42000,
        dedupingInterval: 5000,
        keepPreviousData: true,
    })

    return {
        minAllowedAmount: amountRange?.data?.min_amount,
        maxAllowedAmount: amountRange?.data?.max_amount,
        minAllowedAmountInUsd: amountRange?.data?.min_amount_in_usd,
        maxAllowedAmountInUsd: amountRange?.data?.max_amount_in_usd,
        quote: (quoteError || !canGetQuote) ? undefined : quote?.data,
        isQuoteLoading: isQuoteLoading,
        isDebouncing,
        quoteError,
        mutateFee,
        mutateLimits,
        limitsValidating,
    }
}

export function transformFormValuesToQuoteArgs(values: SwapFormValues, withDelay?: boolean): Props | undefined {
    return {
        amount: values.amount,
        from: values.from?.name,
        depositMethod: values.depositMethod,
        fromCurrency: values.fromAsset?.symbol,
        to: values.to?.name,
        toCurrency: values.toAsset?.symbol,
        refuel: values.refuel,
        withDelay
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

export type QuoteUrlArgs = {
    sourceNetwork: string
    sourceToken: string
    destinationNetwork: string
    destinationToken: string
    amount: string | number
    refuel: boolean
    useDepositAddress: boolean
    slippage?: number
}

export function buildQuoteUrl(args: QuoteUrlArgs): string {
    const {
        sourceNetwork,
        sourceToken,
        destinationNetwork,
        destinationToken,
        amount,
        refuel,
        useDepositAddress,
        slippage,
    } = args

    const params = new URLSearchParams({
        source_network: sourceNetwork,
        source_token: sourceToken,
        destination_network: destinationNetwork,
        destination_token: destinationToken,
        amount: String(amount),
        refuel: String(!!refuel),
        use_deposit_address: useDepositAddress ? 'true' : 'false',
    })

    if (slippage !== undefined) {
        params.append('slippage', String(slippage))
    }

    return `/quote?${params.toString()}`
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
type LoadingState = {
    key: string | null;
    setKey: (value: string | null) => void;
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
};

export const useLoadingStore = create<LoadingState>((set) => ({
    key: null,
    setKey: (value) => set({ key: value }),
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
}));
