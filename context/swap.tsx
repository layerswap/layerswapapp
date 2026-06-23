import { Context, useCallback, useEffect, useState, createContext, useContext, useMemo } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, PublishedSwapTransactions, SwapTransaction, WithdrawType, SwapResponse, DepositAction, SwapBasicData, SwapQuote, Refuel, SwapDetails, TransactionType } from '@/lib/apiClients/layerSwapApiClient';
import { NextRouter, useRouter } from 'next/router';
import { QueryParams } from '../Models/QueryParams';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { Partner } from '../Models/Partner';
import { ApiError } from '../Models/ApiError';
import { resolveSwapPhase } from '../components/utils/resolveSwapPhase';
import { useSwapTransactionStore } from '../stores/swapTransactionStore';
import { Wallet } from '../Models/WalletProvider';
import useWallet from '../hooks/useWallet';
import { Network } from '../Models/Network';
import { TrackEvent } from "@/pages/_document";
import { useSettingsState } from './settings';
import { QuoteError, transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { useRecentNetworksStore } from '@/stores/recentRoutesStore';
import { resolvePersistantQueryParams } from '@/helpers/querryHelper';
import { isDepositAddressFlow, isDepositAddressSwap } from '@/helpers/swapFlow';
import { useSelectedAccount } from './swapAccounts';
import { Address } from '@/lib/address';
import { useSlippageStore } from '@/stores/slippageStore';
import { posthog } from 'posthog-js';
import { resolveExtendedRoutePlan } from '@/lib/extendedRoutes/registry';
import { buildCreateSwapParamsForExtendedRoute } from '@/lib/extendedRoutes/transforms';
import { useExtendedRoutesStore } from '@/stores/extendedRoutesStore';
import { useExtendedSwapData } from '@/hooks/useExtendedSwapDisplay';
import { useContractAddressStore } from '@/stores/contractAddressStore';

export const SwapDataStateContext = createContext<SwapContextData | null>(null);

export const SwapDataUpdateContext = createContext<UpdateSwapInterface | null>(null);

export type UpdateSwapInterface = {
    createSwap: (values: SwapFormValues, query: QueryParams, partner?: Partner) => Promise<SwapResponse>,
    setCodeRequested: (codeSubmitted: boolean) => void;
    setQuoteLoading: (value: boolean) => void;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<ApiResponse<SwapResponse>>
    setDepositAddressIsFromAccount: (value: boolean) => void,
    setWithdrawType: (value: WithdrawType) => void
    setSwapId: (value: string | undefined) => void
    setSwapDataFromQuery?: (swapData: SwapResponse | undefined) => void,
    setSubmitedFormValues: (values: NonNullable<SwapFormValues>) => void,
    setSwapModalOpen: (value: boolean) => void
}

export type SwapContextData = {
    codeRequested: boolean,
    swapApiError?: ApiError,
    depositAddressIsFromAccount?: boolean,
    depositActionsResponse?: DepositAction[],
    depositActionsError?: string,
    withdrawType: WithdrawType | undefined,
    swapTransaction: SwapTransaction | undefined,
    swapBasicData: SwapBasicData & { refuel: boolean } | undefined,
    quote: SwapQuote | undefined,
    quoteIsLoading: boolean,
    quoteError: QuoteError | undefined,
    refuel: Refuel | undefined,
    swapDetails: SwapDetails | undefined,
    swapId: string | undefined,
    swapModalOpen: boolean,
    swapError?: string | null | undefined,
    setSwapError?: (value: string | null) => void
}

export function SwapDataProvider({ children, initialSwapData }: { children: React.ReactNode, initialSwapData?: SwapResponse | null }) {
    const [codeRequested, setCodeRequested] = useState<boolean>(false)
    const [quoteIsLoading, setQuoteLoading] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [depositAddressIsFromAccount, setDepositAddressIsFromAccount] = useState<boolean>()
    const router = useRouter();
    const [swapId, setSwapId] = useState<string | undefined>(router.query.swapId?.toString())
    const [swapTransaction, setSwapTransaction] = useState<SwapTransaction>()
    const { sourceRoutes, destinationRoutes, networks } = useSettingsState()
    const [swapBasicFormData, setSwapBasicFormData] = useState<SwapBasicData & { refuel: boolean }>()
    const updateRecentTokens = useRecentNetworksStore(state => state.updateRecentNetworks)
    const [swapModalOpen, setSwapModalOpen] = useState(false)
    const [swapError, setSwapError] = useState<string | null>(null)

    const quoteArgs = useMemo(() => transformSwapDataToQuoteArgs(swapBasicFormData, !!swapBasicFormData?.refuel), [swapBasicFormData]);

    // Deposit address flow doesn't use limits — min/max come from the detailed quote there
    const { quote: formDataQuote, quoteError: formDataQuoteError } = useQuoteData(quoteArgs, { refreshInterval: swapId ? 0 : undefined, skipLimits: isDepositAddressSwap(swapBasicFormData) });

    const handleUpdateSwapid = useCallback((value: string | undefined) => {
        setSwapId(value)
        if (value) {
            setSwapPath(value, router)
        }
        else {
            removeSwapPath(router)
        }
    }, [router])

    const setSubmitedFormValues = useCallback((values: NonNullable<SwapFormValues>) => {
        if (!values.from || !values.to || !values.fromAsset || !values.toAsset || !values.destination_address)
            throw new Error("Form data is missing")

        if (!isDepositAddressFlow(values.depositMethod, values.fromExchange) && !values.amount)
            throw new Error("Form data is missing")

        setSwapBasicFormData({
            source_network: values.from,
            destination_network: values.to,
            source_token: values.fromAsset,
            destination_token: values.toAsset,
            requested_amount: values.amount || '',
            destination_address: values.destination_address,
            use_deposit_address: values.depositMethod === 'deposit_address',
            refuel: !!values.refuel,
            source_exchange: values.fromExchange,
        })
    }, [sourceRoutes, destinationRoutes])

    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `/swaps/${swapId}?exclude_deposit_actions=true`
    const [interval, setInterval] = useState(0)
    const { data, mutate, error } = useSWR<ApiResponse<SwapResponse>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval, dedupingInterval: interval || 1000, fallbackData: initialSwapData ? { data: initialSwapData } : undefined })

    // Basic data for a loaded swap (real backend identity). `useExtendedSwapData`
    // overlays the extended-route (e.g. Hyperliquid) source/amount/quote on top.
    const baseSwapData = useMemo<(SwapBasicData & { refuel: boolean }) | undefined>(() => {
        if (!(swapId && data?.data?.swap)) return undefined
        return {
            ...data.data.swap,
            requested_amount: data.data.swap.requested_amount.toString(),
            refuel: !!data.data.refuel,
        }
    }, [data, swapId])

    const extendedSwapData = useExtendedSwapData(swapId, baseSwapData, data?.data?.quote)

    const swapBasicData = useMemo(() => {
        if (swapId && data?.data) {
            if (!data.data.swap) return undefined
            return extendedSwapData?.swapBasicData ?? baseSwapData
        }
        return swapBasicFormData
    }, [data, swapBasicFormData, swapId, baseSwapData, extendedSwapData])

    const swapDetails = useMemo(() => {
        if (swapId)
            return data?.data?.swap
    }, [data, swapId])

    const quote = useMemo(() => {
        if (swapId && data?.data) {
            return extendedSwapData ? extendedSwapData.quote : data.data.quote
        }
        return formDataQuote?.quote
    }, [formDataQuote, data, swapId, extendedSwapData]);

    const quoteError = useMemo(() => {
        if (swapId && data?.data) {
            return undefined
        }
        return formDataQuoteError
    }, [formDataQuoteError, data, swapId]);

    const refuel = useMemo(() => {
        if (swapId && data?.data) {
            return data?.data?.refuel
        }
        return formDataQuote?.refuel
    }, [formDataQuote, data, swapId]);

    const selectedSourceAccount = useSelectedAccount("from", swapBasicFormData?.source_network?.name);
    const { wallets } = useWallet(swapBasicFormData?.source_network, 'asSource')
    const selectedWallet = (selectedSourceAccount?.address && swapBasicFormData) && wallets.find(w => Address.equals(w.address, selectedSourceAccount.address, swapBasicFormData?.source_network))
    const { checkContractStatus } = useContractAddressStore();

    const sourceIsSupported = (swapBasicData && selectedWallet) && WalletIsSupportedForSource({
        sourceNetwork: swapBasicData.source_network,
        sourceWallet: selectedWallet
    })

    const use_deposit_address = swapBasicData?.use_deposit_address
    const deposit_actions_endpoint = swapId ? `/swaps/${swapId}/deposit_actions${(use_deposit_address || !selectedSourceAccount || !sourceIsSupported) ? "" : `?source_address=${selectedSourceAccount?.address}`}` : null
    const inputTransfer = swapDetails?.transactions.find(t => t.type === TransactionType.Input);
    const { data: depositActions, error: depositActionsSwrError } = useSWR<ApiResponse<DepositAction[]>>(!inputTransfer ? deposit_actions_endpoint : null, layerswapApiClient.fetcher)

    const depositActionsResponse = depositActions?.data
    const depositActionsError = depositActionsSwrError ? (depositActionsSwrError?.response?.data?.error?.message || 'Could not generate deposit address.') : undefined

    const currentSwap = data?.data?.swap
    const storedWalletTransaction = useSwapTransactionStore(
        state => currentSwap?.id ? state.swapTransactions[currentSwap.id] : undefined,
    )
    const pollingIntervalMs = useMemo(
        () => resolveSwapPhase({
            swapDetails: currentSwap,
            refuel: data?.data?.refuel,
            storedWalletTransaction,
        }).pollingIntervalMs,
        [currentSwap, data?.data?.refuel, storedWalletTransaction],
    )

    useEffect(() => {
        if (!currentSwap?.status) {
            setInterval(0)
            return () => setInterval(0)
        }
        setInterval(pollingIntervalMs)
        return () => setInterval(0)
    }, [pollingIntervalMs, currentSwap?.status])

    useEffect(() => {
        if (!swapId)
            return
        const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
        const txForSwap = data.state?.swapTransactions?.[swapId];
        setSwapTransaction(txForSwap)
    }, [swapId])

    const createSwap = useCallback(async (values: SwapFormValues, query: QueryParams, partner: Partner) => {
        if (!values)
            throw new Error("No swap data")

        const { to, fromAsset: fromCurrency, toAsset: toCurrency, from, refuel, fromExchange, depositMethod, amount, destination_address } = values
        const depositAddressFlow = isDepositAddressFlow(depositMethod, fromExchange)
        if (!to || !fromCurrency || !toCurrency || !from || !destination_address || !depositMethod)
            throw new Error("Form data is missing")
        if (!depositAddressFlow && !amount)
            throw new Error("Form data is missing")

        const sourceWalletIsSupported = selectedWallet && WalletIsSupportedForSource({
            sourceNetwork: from,
            sourceWallet: selectedWallet
        })
        const contractCheckResult = (depositAddressFlow && selectedWallet) ? await checkContractStatus(selectedWallet.address, from, to) : null
        const isContract = contractCheckResult?.sourceIsContract ?? false
        const sourceIsSupported = sourceWalletIsSupported && !isContract

        const slippage = useSlippageStore.getState().slippage

        // Extended source bridge mode (e.g. Hyperliquid): create the real backend
        // swap (Base/USDC) for the forwarded amount (A - flat fee), via a deposit
        // address. The HL withdrawal then funds that deposit address.
        const extendedPlan = resolveExtendedRoutePlan({
            sourceNetworkName: from.name,
            sourceTokenSymbol: fromCurrency.symbol,
            destinationNetworkName: to.name,
            destinationTokenSymbol: toCurrency.symbol,
            sourceAmount: amount,
        })
        const isExtendedBridge = !!extendedPlan

        const data: CreateSwapParams = extendedPlan ? buildCreateSwapParamsForExtendedRoute({
            plan: extendedPlan,
            destinationNetworkName: to.name,
            destinationTokenSymbol: toCurrency.symbol,
            destinationAddress: destination_address,
            referenceId: query.externalId,
            refuel,
        }) : {
            amount: amount || undefined,
            source_network: from.name,
            destination_network: to.name,
            source_token: fromCurrency.symbol,
            destination_token: toCurrency.symbol,
            source_exchange: fromExchange?.name,
            destination_address: destination_address,
            reference_id: query.externalId,
            refuel: !!refuel,
            use_deposit_address: depositMethod === 'wallet' ? false : true,
            source_address: sourceIsSupported ? selectedSourceAccount?.address : undefined,
            refund_address: sourceIsSupported ? selectedSourceAccount?.address : undefined
        }

        if (!isExtendedBridge && depositMethod === 'wallet' && slippage && slippage > 0 && slippage < 0.8) {
            data.slippage = slippage.toString()
        }

        const swapResponse = await layerswapApiClient.CreateSwapAsync(data)

        if (swapResponse?.error) {
            throw swapResponse?.error
        }

        const swap = swapResponse?.data;
        if (!swap?.swap.id)
            throw new Error("Could not create swap")

        // Persist the extended identity so the post-create UI and the withdraw step
        // can keep showing the extended source and resume after a reload.
        if (extendedPlan) {
            useExtendedRoutesStore.getState().setRecord(swap.swap.id, {
                providerId: extendedPlan.mapping.provider.id,
                extendedNetwork: from.name,
                extendedToken: fromCurrency.symbol,
                realNetwork: extendedPlan.mapping.real.networkName,
                realToken: extendedPlan.mapping.real.tokenSymbol,
                sourceAddress: selectedSourceAccount?.address || '',
                sourceAmount: (amount || '').toString(),
                createdAt: Date.now(),
            })
        }

        updateRecentTokens({
            from: !fromExchange ? { network: from.name, token: fromCurrency.symbol } : undefined,
            to: { network: to.name, token: toCurrency.symbol }
        });

        posthog.capture(TrackEvent.SwapInitiated, {
            name: TrackEvent.SwapInitiated,
            swapId: swapDetails?.id ?? null,
            $fromAddress: selectedSourceAccount?.address,
            $toAddress: destination_address,
            path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });

        return swap;
    }, [selectedSourceAccount, selectedWallet, updateRecentTokens, swapDetails?.id, networks])

    const updateFns = useMemo<UpdateSwapInterface>(() => ({
        createSwap,
        setCodeRequested,
        setInterval,
        mutateSwap: mutate,
        setDepositAddressIsFromAccount,
        setWithdrawType,
        setSwapId: handleUpdateSwapid,
        setSubmitedFormValues,
        setQuoteLoading,
        setSwapModalOpen
    }), [createSwap, mutate, handleUpdateSwapid, setSubmitedFormValues]);

    const stateValue = useMemo(() => ({
        withdrawType,
        codeRequested,
        swapTransaction,
        depositAddressIsFromAccount: !!depositAddressIsFromAccount,
        swapApiError: error,
        depositActionsResponse,
        depositActionsError,
        quote,
        quoteIsLoading,
        quoteError,
        refuel,
        swapBasicData,
        swapDetails,
        swapId,
        swapModalOpen,
        swapError,
        setSwapError
    }), [withdrawType, codeRequested, swapTransaction, depositAddressIsFromAccount, error, depositActionsResponse, depositActionsError, quote, quoteIsLoading, quoteError, refuel, swapBasicData, swapDetails, swapId, swapModalOpen, swapError]);

    return (
        <SwapDataStateContext.Provider value={stateValue}>
            <SwapDataUpdateContext.Provider value={updateFns}>
                {children}
            </SwapDataUpdateContext.Provider>
        </SwapDataStateContext.Provider>
    );
}

export function useSwapDataState() {
    const data = useContext(SwapDataStateContext);

    if (data === undefined || data === null) {
        throw new Error('swapData must be used within a SwapDataProvider');
    }
    return data;
}

export function useSwapDataUpdate() {
    const updateFns = useContext<UpdateSwapInterface>(SwapDataUpdateContext as Context<UpdateSwapInterface>);
    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}

const WalletIsSupportedForSource = ({ sourceNetwork, sourceWallet }: { sourceWallet: Wallet | undefined, sourceNetwork: Network | undefined }) => {
    const isSupported = (sourceWallet && sourceWallet?.asSourceSupportedNetworks?.some(n => n === sourceNetwork?.name)) || false
    return isSupported
}


export const setSwapPath = (swapId: string, router: NextRouter) => {
    //TODO: as path should be without basepath and host
    const basePath = router?.basePath || ""
    var swapURL = window.location.protocol + "//"
        + window.location.host + `${basePath}/swap/${swapId}`;
    const searchParams = new URLSearchParams(window.location.search);
    const existing: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        existing[key] = value;
    });
    const params = resolvePersistantQueryParams(existing)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            swapURL += `?${search}`
    }

    window.history.pushState({ ...window.history.state, as: swapURL, url: swapURL }, '', swapURL);
}

export const removeSwapPath = (router: NextRouter) => {
    const basePath = router?.basePath || ""
    let homeURL = window.location.protocol + "//"
        + window.location.host + basePath

    const searchParams = new URLSearchParams(window.location.search);
    const existing: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        existing[key] = value;
    });
    const params = resolvePersistantQueryParams(existing)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            homeURL += `?${search}`
    }
    window.history.replaceState({ ...window.history.state, as: router.asPath, url: homeURL }, '', homeURL);
}
