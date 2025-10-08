import { Context, useCallback, useEffect, useState, createContext, useContext, useMemo } from 'react'
import LayerSwapApiClient, { CreateSwapParams, PublishedSwapTransactions, SwapTransaction, WithdrawType, SwapResponse, DepositAction, SwapBasicData, SwapQuote, Refuel, SwapDetails, TransactionType } from '@/lib/apiClients/layerSwapApiClient';
import { InitialSettings } from '@/Models/InitialSettings';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '@/Models/ApiResponse';
import { Partner } from '@/Models/Partner';
import { ApiError } from '@/Models/ApiError';
import { ResolvePollingInterval } from '@/components/utils/SwapStatus';
import { Wallet, WalletConnectionProvider } from '@/lib/wallets/types/wallet';
import useWallet from '@/hooks/useWallet';
import { Network } from '@/Models/Network';
import { useSettingsState } from './settings';
import { transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { useRecentNetworksStore } from '@/stores/recentRoutesStore';
import { useSelectedAccount } from './balanceAccounts';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { useSwapIdChangeCallback } from './callbackProvider';
import { useInitialSettings } from './settings';
import { addressFormat } from '@/lib/address/formatter';

export const SwapDataStateContext = createContext<SwapContextData>({
    depositAddressIsFromAccount: false,
    withdrawType: undefined,
    swapTransaction: undefined,
    depositActionsResponse: undefined,
    swapApiError: undefined,
    quote: undefined,
    refuel: undefined,
    swapBasicData: undefined,
    swapDetails: undefined,
    quoteIsLoading: false,
    swapId: undefined,
    swapModalOpen: false
});

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
    refuel: Refuel | undefined,
    swapDetails: SwapDetails | undefined,
    quoteIsLoading: boolean,
    swapId: string | undefined,
    swapModalOpen: boolean
}

export function SwapDataProvider({ children }) {
    const [quoteIsLoading, setQuoteLoading] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [depositAddressIsFromAccount, setDepositAddressIsFromAccount] = useState<boolean>()
    const initialSettings = useInitialSettings()
    const [swapId, setSwapId] = useState<string | undefined>(initialSettings.swapId?.toString())
    const [swapTransaction, setSwapTransaction] = useState<SwapTransaction>()
    const { sourceRoutes, destinationRoutes } = useSettingsState()
    const [swapBasicFormData, setSwapBasicFormData] = useState<SwapBasicData & { refuel: boolean }>()
    const updateRecentTokens = useRecentNetworksStore(state => state.updateRecentNetworks)
    const [swapModalOpen, setSwapModalOpen] = useState(false)
    const { providers } = useWallet(swapBasicFormData?.source_network, 'asSource')

    const quoteArgs = useMemo(() => transformSwapDataToQuoteArgs(swapBasicFormData, !!swapBasicFormData?.refuel), [swapBasicFormData]);
    const { quote: formDataQuote } = useQuoteData(swapId ? undefined : quoteArgs);

    const triggerSwapIdChangeCallback = useSwapIdChangeCallback()
    const handleUpdateSwapid = (value: string | undefined) => {
        setSwapId(value)
        triggerSwapIdChangeCallback(value)
    }

    const setSubmitedFormValues = useCallback((values: NonNullable<SwapFormValues>) => {
        const from = sourceRoutes.find(n => n.name === values.from?.name);
        const to = destinationRoutes.find(n => n.name === values.to?.name);
        const fromCurrency = from?.tokens.find(t => t.symbol === values.fromAsset?.symbol)
        const toCurrency = to?.tokens.find(t => t.symbol === values.toAsset?.symbol)
        if (!from || !to || !fromCurrency || !toCurrency || !values.amount! || !values.destination_address) return

        setSwapBasicFormData({
            source_network: from,
            destination_network: to,
            source_token: fromCurrency,
            destination_token: toCurrency,
            requested_amount: Number(values.amount),
            destination_address: values.destination_address,
            use_deposit_address: values.depositMethod === 'deposit_address',
            refuel: !!values.refuel,
            source_exchange: values.fromExchange,
        })
    }, [sourceRoutes, destinationRoutes])

    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `/swaps/${swapId}?exclude_deposit_actions=true`
    const [interval, setInterval] = useState(0)
    const { data, mutate, error } = useSWR<ApiResponse<SwapResponse>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval, dedupingInterval: interval || 1000 })

    const swapBasicData = useMemo(() => {
        if (swapId && data?.data) {
            return data?.data?.swap ? {
                ...data.data.swap,
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

    const refuel = useMemo(() => {
        if (swapId) {
            return data?.data?.refuel
        }
        return formDataQuote?.refuel
    }, [formDataQuote, data, swapId]);

    const selectedSourceAccount = useSelectedAccount("from", swapBasicFormData?.source_network?.name);
    const { wallets } = useWallet(swapBasicFormData?.source_network, 'asSource')
    const selectedWallet = (selectedSourceAccount?.address && swapBasicFormData) && wallets.find(w => addressFormat(w.address, swapBasicFormData?.source_network) === addressFormat(selectedSourceAccount?.address, swapBasicFormData?.source_network))

    const sourceIsSupported = (swapBasicData && selectedWallet) && WalletIsSupportedForSource({
        providers: providers,
        sourceNetwork: swapBasicData.source_network,
        sourceWallet: selectedWallet
    })

    const use_deposit_address = swapBasicData?.use_deposit_address
    const deposit_actions_endpoint = swapId ? `/swaps/${swapId}/deposit_actions${(use_deposit_address || !selectedSourceAccount || !sourceIsSupported) ? "" : `?source_address=${selectedSourceAccount?.address}`}` : null
    const inputTransfer = swapDetails?.transactions.find(t => t.type === TransactionType.Input);
    const { data: depositActions } = useSWR<ApiResponse<DepositAction[]>>(!inputTransfer ? deposit_actions_endpoint : null, layerswapApiClient.fetcher)

    const depositActionsResponse = depositActions?.data
    const swapStatus = data?.data?.swap.status;

    useEffect(() => {
        if (swapStatus)
            setInterval(ResolvePollingInterval(swapStatus))
        return () => {
            setInterval(0)
        }
    }, [swapStatus])

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
        if (!to || !fromCurrency || !toCurrency || !from || !amount || !destination_address || !depositMethod)
            throw new Error("Form data is missing")

        const sourceIsSupported = selectedWallet && WalletIsSupportedForSource({
            providers: providers,
            sourceNetwork: from,
            sourceWallet: selectedWallet
        })

        const data: CreateSwapParams = {
            amount: amount,
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

        const swapResponse = await layerswapApiClient.CreateSwapAsync(data)

        if (swapResponse?.error) {
            throw swapResponse?.error
        }

        const swap = swapResponse?.data;
        if (!swap?.swap.id)
            throw new Error("Could not create swap")

        updateRecentTokens({
            from: !fromExchange ? { network: from.name, token: fromCurrency.symbol } : undefined,
            to: { network: to.name, token: toCurrency.symbol }
        });

        return swap;
    }, [selectedSourceAccount, formDataQuote])

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
            refuel,
            swapBasicData,
            swapDetails,
            quoteIsLoading,
            swapId,
            swapModalOpen
        }}>
            <SwapDataUpdateContext.Provider value={updateFns}>
                {children}
            </SwapDataUpdateContext.Provider>
        </SwapDataStateContext.Provider>
    );
}

export function useSwapDataState() {
    const data = useContext(SwapDataStateContext);

    if (data === undefined) {
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

const WalletIsSupportedForSource = ({ providers, sourceNetwork, sourceWallet }: { providers: WalletConnectionProvider[] | undefined, sourceWallet: Wallet | undefined, sourceNetwork: Network | undefined }) => {
    const isSupported = sourceWallet && providers?.find(p => p.name === sourceWallet.providerName)?.asSourceSupportedNetworks?.some(n => n === sourceNetwork?.name) || false
    return isSupported
}