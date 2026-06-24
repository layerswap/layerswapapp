import { Context, useCallback, useEffect, useState, createContext, useContext, useMemo } from 'react'
import LayerSwapApiClient, { CreateSwapParams, PublishedSwapTransactions, SwapTransaction, WithdrawType, SwapResponse, DepositAction, SwapBasicData, SwapQuote, Refuel, SwapDetails, TransactionType } from '@/lib/apiClients/layerSwapApiClient';
import { InitialSettings } from '@/Models/InitialSettings';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '@/Models/ApiResponse';
import { Partner } from '@/Models/Partner';
import { ApiError } from '@/Models/ApiError';
import { Wallet } from '@/types/wallet';
import useWallet from '@/hooks/useWallet';
import { Network } from '@/Models/Network';
import { useSettingsState } from './settings';
import { QuoteError, transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { useRecentNetworksStore } from '@/stores/recentRoutesStore';
import { useSelectedAccount } from './swapAccounts';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { useInitialSettings } from './settings';
import { useSlippageStore } from '@/stores/slippageStore';
import { useCallbacks } from './callbackProvider';
import { Address } from '@/lib/address/Address';
import { useSwapTransactionStore } from '@/stores';
import { resolveSwapPhase } from '@/components/utils/resolveSwapPhase';
import { useContractAddressStore } from '@/stores/contractAddressStore';
import { useExtendedSwapData } from '@/hooks/useExtendedSwapDisplay';
import { resolveExtendedRoutePlan } from '@/lib/extendedRoutes/registry';
import { buildCreateSwapParamsForExtendedRoute } from '@/lib/extendedRoutes/transforms';
import { useExtendedRoutesStore } from '@/stores/extendedRoutesStore';
import { isDepositAddressFlow, isDepositAddressSwap } from '@/helpers/swapFlow';

export const SwapDataStateContext = createContext<SwapContextData | null>(null);

export const SwapDataUpdateContext = createContext<UpdateSwapInterface | null>(null);

export type UpdateSwapInterface = {
    createSwap: (values: SwapFormValues, query: InitialSettings, partner?: Partner) => Promise<SwapResponse>,
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
    const initialSettings = useInitialSettings()
    const { onSwapCreate } = useCallbacks()
    const [swapBasicFormData, setSwapBasicFormData] = useState<SwapBasicData & { refuel: boolean }>()

    const { providers } = useWallet(swapBasicFormData?.source_network, 'asSource')

    const [quoteIsLoading, setQuoteLoading] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [depositAddressIsFromAccount, setDepositAddressIsFromAccount] = useState<boolean>()
    // A pre-created swap (e.g. the deposit widget's prefetcher) seeds both the
    // id and, via SWR fallbackData below, the swap details — so consumers render
    // with data on first paint instead of a loading state.
    const [swapId, setSwapId] = useState<string | undefined>(initialSettings.swapId?.toString() ?? initialSwapData?.swap.id)
    const [swapTransaction, setSwapTransaction] = useState<SwapTransaction>()
    const { sourceRoutes, destinationRoutes, networks } = useSettingsState()
    const updateRecentTokens = useRecentNetworksStore(state => state.updateRecentNetworks)
    const [swapModalOpen, setSwapModalOpen] = useState(false)
    const [swapError, setSwapError] = useState<string | null>(null)

    const quoteArgs = useMemo(() => transformSwapDataToQuoteArgs(swapBasicFormData, !!swapBasicFormData?.refuel), [swapBasicFormData]);

    // Deposit address flow doesn't use limits — min/max come from the detailed quote there
    const { quote: formDataQuote, quoteError: formDataQuoteError } = useQuoteData(quoteArgs, { refreshInterval: swapId ? 0 : undefined, skipLimits: isDepositAddressSwap(swapBasicFormData) });

    const handleUpdateSwapid = (value: string | undefined) => {
        setSwapId(value)
    }

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
    // Scope the fallback to the seeded swap's own id: SWR applies fallbackData
    // to ANY key with an empty cache, so without the guard a newly created swap
    // (e.g. after a source change) would briefly read as the seeded one and get
    // dropped by the form's stale-swap effect.
    const seededSwapIsActive = !!initialSwapData && swapId === initialSwapData.swap.id
    const { data, mutate, error } = useSWR<ApiResponse<SwapResponse>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval, dedupingInterval: interval || 1000, fallbackData: seededSwapIsActive ? { data: initialSwapData } : undefined })

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

    // The create-swap response may already carry deposit actions — use them as
    // a fallback (only while the seeded swap is still the active one) so the
    // deposit address renders without waiting for the separate fetch.
    const depositActionsResponse = depositActions?.data
        ?? (swapId && swapId === initialSwapData?.swap.id ? initialSwapData?.deposit_actions : undefined)
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

    const createSwap = useCallback(async (values: SwapFormValues, query: InitialSettings, partner: Partner) => {
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
            availableRoutes: sourceRoutes,
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

        onSwapCreate(swap)
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


        return swap;
    }, [selectedSourceAccount, selectedWallet, onSwapCreate, updateRecentTokens, swapDetails?.id, networks, sourceRoutes])

    const updateFns = useMemo<UpdateSwapInterface>(() => ({
        createSwap,
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
    }), [withdrawType, swapTransaction, depositAddressIsFromAccount, error, depositActionsResponse, depositActionsError, quote, quoteIsLoading, quoteError, refuel, swapBasicData, swapDetails, swapId, swapModalOpen, swapError]);

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

export const WalletIsSupportedForSource = ({ sourceNetwork, sourceWallet }: { sourceWallet: Wallet | undefined, sourceNetwork: Network | undefined }) => {
    const isSupported = (sourceWallet && sourceWallet?.asSourceSupportedNetworks?.some(n => n === sourceNetwork?.name)) || false
    return isSupported
}
