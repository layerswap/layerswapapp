import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import LayerSwapApiClient, { Quote, SwapBasicData, SwapQuote } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'
import { create } from 'zustand';
import { isDiffByPercent } from '@/components/utils/numbers'
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { useSlippageStore } from '@/stores/slippageStore'
import { sleep } from '@/lib/wallets/utils';
import { useSettingsState } from '@/context/settings'
import { resolveExtendedRoutePlan } from '@/lib/extendedRoutes/registry'
import { usesDepository } from '@/lib/extendedRoutes/types'
import { transformLimitsForExtendedRoute, transformQuoteForExtendedRoute } from '@/lib/extendedRoutes/transforms'
import { isPositiveDecimal } from '@/lib/extendedRoutes/amounts'
import { LayerswapApiClient } from '@/lib/apiClients';

const apiClient = new LayerswapApiClient()

export type QuoteTokenPrices = Pick<SwapQuote, 'source_token' | 'destination_token'>

type UseQuoteData = {
    minAllowedAmount?: number
    maxAllowedAmount?: number
    minAllowedAmountInUsd?: number
    maxAllowedAmountInUsd?: number
    quote?: Quote
    quoteTokenPrices?: QuoteTokenPrices
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
}
type Options = {
    skipLimits?: boolean
    refreshInterval?: number
}

export function useQuoteData(formValues: Props | undefined, options: Options = { skipLimits: false, refreshInterval: 20000 }): UseQuoteData {
    const { fromCurrency, toCurrency, from, to, amount, refuel, depositMethod } = formValues || {}
    const { skipLimits, refreshInterval } = options

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

    const use_deposit_address = depositMethod === 'wallet' ? false : true

    // Extended source (e.g. Hyperliquid): the backend doesn't know this source,
    // so quote/limits are fetched against the real route it maps to.
    const { networks, sourceRoutes } = useSettingsState()
    const extendedPlan = useMemo(() => resolveExtendedRoutePlan({
        sourceNetworkName: from,
        sourceTokenSymbol: fromCurrency,
        destinationNetworkName: to,
        destinationTokenSymbol: toCurrency,
        sourceAmount: debouncedAmount,
        availableRoutes: sourceRoutes,
    }), [from, fromCurrency, to, toCurrency, debouncedAmount, sourceRoutes])
    const extendedMapping = extendedPlan?.mapping
    const isBridge = !!extendedPlan
    const effectiveFrom = isBridge ? extendedMapping!.real.networkName : from
    const effectiveFromToken = isBridge ? extendedMapping!.real.tokenSymbol : fromCurrency
    const effectiveUseDepositAddress = extendedPlan ? !usesDepository(extendedMapping!.provider) : use_deposit_address

    const extendedNetworkObj = useMemo(() => extendedMapping ? networks.find(n => n.name === extendedMapping.extendedNetworkName) : undefined, [networks, extendedMapping])
    const extendedTokenObj = useMemo(() => extendedNetworkObj?.tokens.find(t => t.symbol === extendedMapping?.extendedTokenSymbol), [extendedNetworkObj, extendedMapping])

    const limitsURL = (!skipLimits && from && to && depositMethod && toCurrency && fromCurrency) ?
        buildLimitsUrl({
            sourceNetwork: effectiveFrom!,
            sourceToken: effectiveFromToken!,
            destinationNetwork: to!,
            destinationToken: toCurrency!,
            useDepositAddress: effectiveUseDepositAddress,
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

    const hasQuoteParams = from && to && depositMethod && toCurrency && fromCurrency && debouncedAmount

    // Bridge mode fetches the backend quote for the truncated real amount (A - fee).
    const effectiveAmount = isBridge ? extendedPlan.realAmount : debouncedAmount

    const quoteURL = (hasQuoteParams && !isDebouncing && (!isBridge || (effectiveAmount && isPositiveDecimal(effectiveAmount))))
        ? buildQuoteUrl({
            sourceNetwork: effectiveFrom!,
            sourceToken: effectiveFromToken!,
            destinationNetwork: to!,
            destinationToken: toCurrency!,
            amount: effectiveAmount || 0,
            refuel: !!refuel,
            useDepositAddress: effectiveUseDepositAddress,
            slippage,
        })
        : null

    const { cache } = useSWRConfig();
    const isQuoteLoading = useLoadingStore((state) => state.isLoading);
    // Remember the last settled quote we emitted, so that while the next one loads we don't flash stale data after an empty state (e.g. a route that errored).
    const lastSettledQuoteRef = useRef<Quote | undefined>(undefined)
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

    const { data: quote, mutate: mutateFee, error: quoteError, isLoading: swrIsLoading } = useSWR<ApiResponse<Quote>>(quoteURL, quoteFetchWrapper, {
        refreshInterval: (refreshInterval || refreshInterval == 0) ? refreshInterval : 42000,
        dedupingInterval: 5000,
        keepPreviousData: true,
    })

    const quoteData = quote?.data
    const hasValidAmount = !!debouncedAmount && isPositiveDecimal(String(debouncedAmount))
    const isTransitioning = swrIsLoading || isDebouncing
    const resolvedQuote = (quoteError || !hasQuoteParams || !hasValidAmount) ? undefined : quoteData
    if (!isTransitioning) lastSettledQuoteRef.current = resolvedQuote
    const suppressStale = isTransitioning && lastSettledQuoteRef.current === undefined

    // Re-denominate the backend quote so the source side reads as the extended route.
    let finalQuote = suppressStale ? undefined : resolvedQuote
    if (extendedMapping && hasValidAmount && debouncedAmount) {
        const sourceAmount = String(debouncedAmount)
        if (isBridge && finalQuote && extendedNetworkObj && extendedTokenObj) {
            finalQuote = transformQuoteForExtendedRoute(finalQuote, extendedMapping, extendedNetworkObj, extendedTokenObj, sourceAmount)
        }
    }

    let minAllowedAmount = amountRange?.data?.min_amount
    let maxAllowedAmount = amountRange?.data?.max_amount
    let minAllowedAmountInUsd = amountRange?.data?.min_amount_in_usd
    let maxAllowedAmountInUsd = amountRange?.data?.max_amount_in_usd
    if (isBridge && extendedMapping) {
        const transformed = transformLimitsForExtendedRoute(amountRange?.data, extendedMapping)
        minAllowedAmount = transformed?.min_amount
        maxAllowedAmount = transformed?.max_amount
        minAllowedAmountInUsd = transformed?.min_amount_in_usd
        maxAllowedAmountInUsd = transformed?.max_amount_in_usd
    }

    return {
        minAllowedAmount,
        maxAllowedAmount,
        minAllowedAmountInUsd,
        maxAllowedAmountInUsd,
        quote: finalQuote,
        quoteTokenPrices: (finalQuote?.quote && !suppressStale) ? {
            source_token: finalQuote.quote.source_token,
            destination_token: finalQuote.quote.destination_token,
        } : undefined,
        isQuoteLoading,
        isDebouncing,
        quoteError,
        mutateFee,
        mutateLimits,
        limitsValidating,
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
        refuel: values.refuel,
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
