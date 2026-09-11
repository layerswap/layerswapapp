import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { unstable_serialize, useSWRConfig } from 'swr'
import { Quote, SwapBasicData, SwapQuote } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'
import { create } from 'zustand';
import { isDiffByPercent } from '@/components/utils/numbers'
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { useSlippageStore } from '@/stores/slippageStore'
import { sleep } from '@layerswap/utils';
import { useSettingsState } from '@/context/settings'
import { resolveExtendedRoutePlan } from '@/lib/extendedRoutes/registry'
import { usesDepository } from '@layerswap/widget-types';
import { transformLimitsForExtendedRoute, transformQuoteForExtendedRoute } from '@/lib/extendedRoutes/transforms'
import { isPositiveDecimal } from '@/lib/extendedRoutes/amounts'
import { LayerswapApiClient } from '@/lib/apiClients';
import { useSelectedAccount } from '@/context/swapAccounts'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import { isGaslessCapableRoute } from '@/helpers/gasless'
import { Address } from '@/lib/address/Address';
import { isTokenSwap, receiveRequestParams, receiveSettingsError, receiveSettingsScope, resolveReceiveSettings } from '@/lib/receiveSettings'

import { buildQuoteUrl } from '@/lib/quoteRequest'
export { buildQuoteUrl, type QuoteUrlArgs } from '@/lib/quoteRequest'

const apiClient = new LayerswapApiClient()

export type QuoteTokenPrices = Pick<SwapQuote, 'source_token' | 'destination_token'>

type UseQuoteData = {
    minAllowedAmount?: number
    maxAllowedAmount?: number
    minAllowedAmountInUsd?: number
    maxAllowedAmountInUsd?: number
    quote?: Quote
    // Estimates may stay visible during an edit; only `quote` is valid for submission.
    displayQuote?: Quote
    quoteTokenPrices?: QuoteTokenPrices
    quoteError?: QuoteError
    limitsError?: QuoteError
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
    destinationAddress?: string
}
type Options = {
    skipLimits?: boolean
    refreshInterval?: number
}

export function useQuoteData(formValues: Props | undefined, options: Options = { skipLimits: false, refreshInterval: 20000 }): UseQuoteData {
    const { fromCurrency, toCurrency, from, to, amount, refuel, depositMethod, destinationAddress } = formValues || {}
    const { skipLimits, refreshInterval } = options

    const [debouncedAmount, setDebouncedAmount] = useState(amount)
    const storedReceiveSettings = useSlippageStore(state => state.receiveSettings)
    const receiveSettingsRevision = useSlippageStore(state => state.revision)
    const receiveSettings = resolveReceiveSettings(storedReceiveSettings, receiveSettingsScope(formValues ?? {}), isTokenSwap(fromCurrency, toCurrency))
    const selectionKey = JSON.stringify(receiveSettings)
    const [debouncedSelectionKey, setDebouncedSelectionKey] = useState(selectionKey)
    const isDebouncing = amount !== debouncedAmount || selectionKey !== debouncedSelectionKey
    const inputError = receiveSettingsError(receiveSettings)
    const receiveParams = inputError ? {} : receiveRequestParams(receiveSettings)
    useEffect(() => {
        if (!isDebouncing) return

        const handler = setTimeout(() => {
            setDebouncedAmount(amount)
            setDebouncedSelectionKey(selectionKey)
        }, 300)

        return () => {
            clearTimeout(handler)
        }
    }, [amount, selectionKey, isDebouncing])

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

    // Mirror the swap-create gasless gate so quote/limits reflect the gasless route.
    const gaslessEnabled = useGaslessPreferenceStore(s => s.gaslessEnabled)
    const selectedSourceAccount = useSelectedAccount("from", from)
    const sourceRouteToken = useMemo(() => sourceRoutes?.find(r => r.name === from)?.tokens?.find(t => t.symbol === fromCurrency), [sourceRoutes, from, fromCurrency])
    const sourceIsSupported = !!selectedSourceAccount?.walletAsSourceSupportedNetworks?.some(n => n === from)
    const sourceAddress = sourceIsSupported ? selectedSourceAccount?.address : undefined
    const useGasless = !isBridge && gaslessEnabled && isGaslessCapableRoute({
        depositMethod,
        supportsGaslessDeposit: sourceRouteToken?.supports_gasless_deposit,
        sourceIsSupported,
        sourceAddress: selectedSourceAccount?.address,
    })

    const limitsURL = (!skipLimits && from && to && depositMethod && toCurrency && fromCurrency) ?
        buildLimitsUrl({
            sourceNetwork: effectiveFrom!,
            sourceToken: effectiveFromToken!,
            destinationNetwork: to!,
            destinationToken: toCurrency!,
            useDepositAddress: effectiveUseDepositAddress,
            refuel,
            useGasless,
            destinationAddress,
        }) : null

    const { data: amountRange, mutate: mutateLimits, isValidating: limitsValidating, error: limitsError } = useSWR<ApiResponse<{
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

    const quoteURL = (hasQuoteParams && !isDebouncing && !inputError && (!isBridge || (effectiveAmount && isPositiveDecimal(effectiveAmount))))
        ? buildQuoteUrl({
            sourceNetwork: effectiveFrom!,
            sourceToken: effectiveFromToken!,
            destinationNetwork: to!,
            destinationToken: toCurrency!,
            amount: effectiveAmount || 0,
            refuel: !!refuel,
            useDepositAddress: effectiveUseDepositAddress,
            slippage: receiveParams.slippage === undefined ? undefined : Number(receiveParams.slippage),
            minReceiveAmount: receiveParams.min_receive_amount,
            useGasless,
            destinationAddress,
            sourceAddress,
        })
        : null

    const { cache } = useSWRConfig();
    const isQuoteLoading = useLoadingStore((state) => state.isLoading);
    const displayQuoteRef = useRef<{ scope: string; quote: Quote } | undefined>(undefined)
    //TODO: implement middleware that handles the delay logic
    const quoteFetchWrapper = useCallback(async ([url, revision]: readonly [string, number]): Promise<ApiResponse<Quote>> => {
        const { setLoading, key, setKey } = useLoadingStore.getState()
        try {
            if (key !== url) {
                setLoading(true)
            }

            const previousData = cache.get(unstable_serialize([url, revision]))?.data as ApiResponse<Quote>
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
            setLoading(false)
            setKey(null)
            throw error
        }
    }, [cache])

    // Returning to Auto must not reuse a quote (and token prices) from before the
    // user's edits. All consumers still share and refresh the current selection.
    const quoteKey = quoteURL ? [quoteURL, receiveSettingsRevision] as const : null
    const { data: quote, mutate: mutateFee, error: requestError, isLoading: swrIsLoading } = useSWR<ApiResponse<Quote>>(quoteKey, quoteFetchWrapper, {
        refreshInterval: (refreshInterval || refreshInterval == 0) ? refreshInterval : 42000,
        dedupingInterval: 5000,
        keepPreviousData: true,
    })

    const quoteError = inputError ? { code: 'RECEIVE_SETTINGS_INVALID', message: inputError } : requestError ?? (!swrIsLoading && !isDebouncing ? quote?.error : undefined)
    const quoteData = swrIsLoading ? undefined : quote?.data
    const hasValidAmount = !!debouncedAmount && isPositiveDecimal(String(debouncedAmount))
    const isTransitioning = swrIsLoading || isDebouncing
    const resolvedQuote = (quoteError || isDebouncing || !quoteURL || !hasQuoteParams || !hasValidAmount) ? undefined : quoteData

    // Re-denominate the backend quote so the source side reads as the extended route.
    let finalQuote = resolvedQuote
    if (extendedMapping && hasValidAmount && debouncedAmount) {
        const sourceAmount = String(debouncedAmount)
        if (isBridge && finalQuote && extendedNetworkObj && extendedTokenObj) {
            finalQuote = transformQuoteForExtendedRoute(finalQuote, extendedMapping, extendedNetworkObj, extendedTokenObj, sourceAmount)
        }
    }

    // Changing the receive setting must not animate estimates to zero while its
    // quote loads. Never carry these estimates across an amount or route change,
    // or reuse them to validate or create a swap.
    const displayScope = JSON.stringify([
        receiveSettingsScope(formValues ?? {}), refuel, destinationAddress,
        sourceAddress, useGasless, effectiveFrom, effectiveFromToken,
    ])
    const previousDisplayQuote = displayQuoteRef.current
    const displayQuote = finalQuote ?? (isTransitioning && !quoteError && previousDisplayQuote?.scope === displayScope ? previousDisplayQuote.quote : undefined)
    useEffect(() => {
        displayQuoteRef.current = displayQuote ? { scope: displayScope, quote: displayQuote } : undefined
    }, [displayScope, displayQuote])

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
        displayQuote,
        quoteTokenPrices: finalQuote?.quote ? {
            source_token: finalQuote.quote.source_token,
            destination_token: finalQuote.quote.destination_token,
        } : undefined,
        isQuoteLoading: isQuoteLoading || swrIsLoading || isDebouncing,
        isDebouncing,
        quoteError,
        limitsError,
        mutateFee,
        mutateLimits,
        limitsValidating,
    }
}

export function validDestinationAddress(address: string | undefined, network: { name: string } | undefined | null): string | undefined {
    return address && Address.isValid(address, network) ? address : undefined
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
        destinationAddress: validDestinationAddress(values.destination_address, values.to),
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
        destinationAddress: validDestinationAddress(swapData?.destination_address, swapData?.destination_network),
    }
}


export const getLimits = async (swapValues: LimitsQueryOptions) => {
    const { sourceToken, sourceNetwork, destinationNetwork, destinationToken, refuel, useDepositAddress, destinationAddress } = swapValues || {}

    if (!sourceNetwork || !destinationNetwork || !useDepositAddress || !destinationToken || !sourceToken)
        return { minAllowedAmount: undefined, maxAllowedAmount: undefined }

    const url = buildLimitsUrl({
        sourceNetwork,
        sourceToken,
        destinationNetwork,
        destinationToken,
        useDepositAddress,
        refuel,
        destinationAddress
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
    useGasless?: boolean;
    destinationAddress?: string;
}

export function buildLimitsUrl({
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    useDepositAddress,
    refuel = false,
    useGasless = false,
    destinationAddress
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

    if (useGasless) {
        params.append('use_gasless', 'true');
    }

    if (destinationAddress) {
        params.append('destination_address', destinationAddress);
    }

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
