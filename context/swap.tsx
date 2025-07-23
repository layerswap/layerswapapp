import { Context, useCallback, useEffect, useState, createContext, useContext, useMemo } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, PublishedSwapTransactions, SwapTransaction, WithdrawType, SwapResponse, DepositAction, Quote, SwapBasicData, SwapQuote, Refuel, SwapDetails } from '@/lib/apiClients/layerSwapApiClient';
import { NextRouter, useRouter } from 'next/router';
import { QueryParams } from '../Models/QueryParams';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { Partner } from '../Models/Partner';
import { ApiError } from '../Models/ApiError';
import { ResolvePollingInterval } from '../components/utils/SwapStatus';
import { Wallet, WalletProvider } from '../Models/WalletProvider';
import useWallet from '../hooks/useWallet';
import { Network } from '../Models/Network';
import { resolvePersistantQueryParams } from '../helpers/querryHelper';
import { TrackEvent } from "@/pages/_document";
import { parse, ParsedUrlQuery } from 'querystring';
import { useSettingsState } from './settings';
import { transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';

export const SwapDataStateContext = createContext<SwapContextData>({
    codeRequested: false,
    depositAddressIsFromAccount: false,
    withdrawType: undefined,
    swapTransaction: undefined,
    depositActionsResponse: undefined,
    swapApiError: undefined,
    quote: undefined,
    refuel: undefined,
    swapBasicData: undefined,
    swapDetails: undefined,
});

export const SwapDataUpdateContext = createContext<UpdateSwapInterface | null>(null);

export type UpdateSwapInterface = {
    createSwap: (values: SwapFormValues, query: QueryParams, partner?: Partner) => Promise<SwapResponse>,
    setCodeRequested: (codeSubmitted: boolean) => void;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<ApiResponse<SwapResponse>>
    setDepositAddressIsFromAccount: (value: boolean) => void,
    setWithdrawType: (value: WithdrawType) => void
    setSwapId: (value: string | undefined) => void
    setSelectedSourceAccount: (value: { wallet: Wallet, address: string } | undefined) => void
    setSwapDataFromQuery?: (swapData: SwapResponse | undefined) => void,
    setSubmitedFormValues: (values: NonNullable<SwapFormValues>) => void,
}

export type SwapContextData = {
    codeRequested: boolean,
    swapApiError?: ApiError,
    depositAddressIsFromAccount?: boolean,
    depositActionsResponse?: DepositAction[],
    withdrawType: WithdrawType | undefined,
    swapTransaction: SwapTransaction | undefined,
    swapBasicData: SwapBasicData & { refuel: boolean } | undefined,
    quote: SwapQuote | undefined,
    refuel: Refuel | undefined,
    swapDetails: SwapDetails | undefined,
}

export function SwapDataProvider({ children }) {
    const [codeRequested, setCodeRequested] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [depositAddressIsFromAccount, setDepositAddressIsFromAccount] = useState<boolean>()
    const router = useRouter();
    const { providers } = useWallet()
    const [swapId, setSwapId] = useState<string | undefined>(router.query.swapId?.toString())
    const [selectedSourceAccount, setSelectedSourceAccount] = useState<{ wallet: Wallet, address: string } | undefined>()
    const [swapTransaction, setSwapTransaction] = useState<SwapTransaction>()
    const { sourceRoutes, destinationRoutes } = useSettingsState()
    const [swapBasicFormData, setSwapBasicFormData] = useState<SwapBasicData & { refuel: boolean }>()

    const quoteArgs = useMemo(() => transformSwapDataToQuoteArgs(swapBasicFormData, !!swapBasicFormData?.refuel), [swapBasicFormData]);
    const { quote: formDataQuote } = useQuoteData(swapId ? undefined : quoteArgs);

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
    const { data, mutate, error } = useSWR<ApiResponse<SwapResponse>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

    const handleChangeSelectedSourceAccount = (props: { wallet: Wallet, address: string } | undefined) => {
        if (!props) {
            setSelectedSourceAccount(undefined)
            return
        }
        const { wallet, address } = props || {}
        const provider = providers?.find(p => p.name === wallet.providerName)
        if (provider?.activeWallet?.address.toLowerCase() !== address.toLowerCase()) {
            provider?.switchAccount && provider?.switchAccount(wallet, address)
        }
        setSelectedSourceAccount({ wallet, address })
    }

    const swapBasicData = useMemo(() => {
        if (swapId) {
            return data?.data?.swap ? {
                ...data.data.swap,
                refuel: !!data.data.refuel
            } : undefined;
        }
        return swapBasicFormData
    }, [data, swapBasicFormData, swapId])

    const swapDetails = useMemo(() => {
        return data?.data?.swap
    }, [data])

    const quote = useMemo(() => {
        if (swapId) {
            return data?.data?.quote
        }
        return formDataQuote?.quote
    }, [formDataQuote, data]);

    const refuel = useMemo(() => {
        if (swapId) {
            return data?.data?.refuel
        }
        return formDataQuote?.refuel
    }, [formDataQuote, data]);


    const sourceIsSupported = swapBasicData && WalletIsSupportedForSource({
        providers: providers,
        sourceNetwork: swapBasicData.source_network,
        sourceWallet: selectedSourceAccount?.wallet
    })

    const use_deposit_address = swapBasicData?.use_deposit_address
    const deposit_actions_endpoint = swapId ? `/swaps/${swapId}/deposit_actions${(use_deposit_address || !selectedSourceAccount || !sourceIsSupported) ? "" : `?source_address=${selectedSourceAccount?.address}`}` : null

    const { data: depositActions } = useSWR<ApiResponse<DepositAction[]>>(deposit_actions_endpoint, layerswapApiClient.fetcher)

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

    const createSwap = useCallback(async (values: SwapFormValues, query: QueryParams, partner: Partner) => {
        if (!values)
            throw new Error("No swap data")

        const { to, fromAsset: fromCurrency, toAsset: toCurrency, from, refuel, fromExchange, depositMethod, amount, destination_address, currencyGroup } = values
        if (!to || !fromCurrency || !toCurrency || !from || !amount || !destination_address || !depositMethod)
            throw new Error("Form data is missing")

        const sourceLayer = from
        const destinationLayer = to

        const sourceIsSupported = WalletIsSupportedForSource({
            providers: providers,
            sourceNetwork: sourceLayer,
            sourceWallet: selectedSourceAccount?.wallet
        })

        const data: CreateSwapParams = {
            amount: amount,
            source_network: sourceLayer.name,
            destination_network: destinationLayer.name,
            source_token: fromCurrency.symbol,
            destination_token: toCurrency.symbol,
            source_exchange: fromExchange?.name,
            destination_address: destination_address,
            reference_id: query.externalId,
            refuel: !!refuel,
            use_deposit_address: depositMethod === 'wallet' ? false : true,
            source_address: sourceIsSupported ? selectedSourceAccount?.address : undefined
        }

        const swapResponse = await layerswapApiClient.CreateSwapAsync(data)
        if (swapResponse?.error) {
            throw swapResponse?.error
        }

        const swap = swapResponse?.data;
        if (!swap?.swap.id)
            throw new Error("Could not create swap")

        window.safary?.track({
            eventType: 'swap',
            eventName: 'swap_created',
            parameters: {
                custom_str_1_label: "from",
                custom_str_1_value: fromExchange?.display_name || from?.display_name!,
                custom_str_2_label: "to",
                walletAddress: (fromExchange || depositMethod !== 'wallet') ? '' : selectedSourceAccount?.address!,
                custom_str_2_value: to?.display_name!,
                fromCurrency: fromExchange ? currencyGroup?.symbol! : fromCurrency?.symbol!,
                toCurrency: toCurrency?.symbol!,
                fromAmount: amount!,
                toAmount: amount!
            }
        })
        plausible(TrackEvent.SwapInitiated)

        return swap;
    }, [selectedSourceAccount])

    const updateFns: UpdateSwapInterface = {
        createSwap: createSwap,
        setCodeRequested: setCodeRequested,
        setInterval: setInterval,
        mutateSwap: mutate,
        setDepositAddressIsFromAccount: setDepositAddressIsFromAccount,
        setWithdrawType,
        setSwapId,
        setSelectedSourceAccount: handleChangeSelectedSourceAccount,
        setSubmitedFormValues
    };
    return (
        <SwapDataStateContext.Provider value={{
            withdrawType,
            codeRequested,
            swapTransaction,
            depositAddressIsFromAccount: !!depositAddressIsFromAccount,
            swapApiError: error,
            depositActionsResponse,
            quote,
            refuel,
            swapBasicData,
            swapDetails
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

const WalletIsSupportedForSource = ({ providers, sourceNetwork, sourceWallet }: { providers: WalletProvider[] | undefined, sourceWallet: Wallet | undefined, sourceNetwork: Network | undefined }) => {
    const isSupported = sourceWallet && providers?.find(p => p.name === sourceWallet.providerName)?.asSourceSupportedNetworks?.some(n => n === sourceNetwork?.name) || false
    return isSupported
}
