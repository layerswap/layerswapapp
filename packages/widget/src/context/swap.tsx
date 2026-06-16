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
    setSwapError?: (value: string) => void
}

export function SwapDataProvider({ children, initialSwapData }: { children: React.ReactNode, initialSwapData?: SwapResponse | null }) {
    const { sourceRoutes, destinationRoutes } = useSettingsState()
    const initialSettings = useInitialSettings()
    const { onSwapCreate } = useCallbacks()
    const updateRecentTokens = useRecentNetworksStore(state => state.updateRecentNetworks)

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
    const [swapModalOpen, setSwapModalOpen] = useState(false)
    const [swapError, setSwapError] = useState<string>('')

    const quoteArgs = useMemo(() => transformSwapDataToQuoteArgs(swapBasicFormData, !!swapBasicFormData?.refuel), [swapBasicFormData]);

    const { quote: formDataQuote, quoteError: formDataQuoteError } = useQuoteData(quoteArgs, swapId ? 0 : undefined);

    const handleUpdateSwapid = (value: string | undefined) => {
        setSwapId(value)
    }

    const setSubmitedFormValues = useCallback((values: NonNullable<SwapFormValues>) => {
        const isDepositAddressFlow = values.depositMethod === 'deposit_address' && !values.fromExchange;

        if (!values.from || !values.to || !values.fromAsset || !values.toAsset || !values.destination_address)
            throw new Error("Form data is missing")

        if (!isDepositAddressFlow && !values.amount)
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

    const swapBasicData = useMemo(() => {
        if (swapId && data?.data) {
            return data?.data?.swap ? {
                ...data.data.swap,
                requested_amount: data.data.swap.requested_amount.toString(),
                refuel: !!data.data.refuel
            } : undefined;
        }
        return swapBasicFormData
    }, [data, swapBasicFormData, swapId])

    const swapDetails = useMemo(() => {
        if (swapId)
            return data?.data?.swap
    }, [data, swapId])

    const quote = useMemo(() => {
        if (swapId && data?.data) {
            return data?.data?.quote
        }
        return formDataQuote?.quote
    }, [formDataQuote, data, swapId]);

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
    const { data: depositActions } = useSWR<ApiResponse<DepositAction[]>>(!inputTransfer ? deposit_actions_endpoint : null, layerswapApiClient.fetcher)

    // The create-swap response may already carry deposit actions — use them as
    // a fallback (only while the seeded swap is still the active one) so the
    // deposit address renders without waiting for the separate fetch.
    const depositActionsResponse = depositActions?.data
        ?? (swapId && swapId === initialSwapData?.swap.id ? initialSwapData?.deposit_actions : undefined)

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
        const isDepositAddressFlow = depositMethod === 'deposit_address' && !fromExchange;

        if (!to || !fromCurrency || !toCurrency || !from || !destination_address || !depositMethod)
            throw new Error("Form data is missing")
        if (!isDepositAddressFlow && !amount)
            throw new Error("Form data is missing")

        const sourceWalletIsSupported = selectedWallet && WalletIsSupportedForSource({
            sourceNetwork: from,
            sourceWallet: selectedWallet
        })
        const contractCheckResult = (isDepositAddressFlow && selectedWallet) ? await checkContractStatus(selectedWallet.address, from, to) : null
        const isContract = contractCheckResult?.sourceIsContract ?? false
        const sourceIsSupported = sourceWalletIsSupported && !isContract

        const slippage = useSlippageStore.getState().slippage
        // In the deposit-address flow the user hasn't committed to an amount
        // yet — they'll send whatever they want to the QR address. Sending a
        // value here (especially "0", which falls through the `||` because
        // it's a truthy string) makes the API reject the swap.
        const numericAmount = amount ? Number(amount) : 0;
        const data: CreateSwapParams = {
            amount: isDepositAddressFlow || !numericAmount ? undefined : amount,
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

        if (depositMethod === 'wallet' && slippage && slippage > 0 && slippage < 0.8) {
            data.slippage = slippage.toString()
        }

        let swapResponse
        try {
            swapResponse = await layerswapApiClient.CreateSwapAsync(data)
        } catch (error) {
            setSwapError(error?.response?.data?.error?.message || 'Unexpected error occurred.')
        }

        if (swapResponse?.error) {
            throw swapResponse?.error
        }



        const swap = swapResponse?.data;
        if (!swap?.swap.id)
            throw new Error("Could not create swap")

        onSwapCreate(swap)

        updateRecentTokens({
            from: !fromExchange ? { network: from.name, token: fromCurrency.symbol } : undefined,
            to: { network: to.name, token: toCurrency.symbol }
        });


        return swap;
    }, [selectedSourceAccount, formDataQuote, onSwapCreate])

    const updateFns: UpdateSwapInterface = {
        createSwap,
        setInterval,
        mutateSwap: mutate,
        setDepositAddressIsFromAccount,
        setWithdrawType,
        setSwapId: handleUpdateSwapid,
        setSubmitedFormValues,
        setQuoteLoading,
        setSwapModalOpen
    };
    return (
        <SwapDataStateContext.Provider value={{
            withdrawType,
            swapTransaction,
            depositAddressIsFromAccount: !!depositAddressIsFromAccount,
            swapApiError: error,
            depositActionsResponse,
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
        }}>
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