import { Context, useCallback, useEffect, useState, createContext, useContext, useMemo } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, PublishedSwapTransactions, SwapTransaction, WithdrawType, SwapResponse, DepositAction, Quote } from '@/lib/apiClients/layerSwapApiClient';
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
import { useQuote } from './feeContext';
import { SwapStatus } from '../Models/SwapStatus';
import { LayerSwapAppSettings } from '@/Models/LayerSwapAppSettings';
import { useSettingsState } from './settings';
import { TrackEvent } from "@/pages/_document";
import { usePersistedState } from '@/hooks/usePersistedState';

export const SwapDataStateContext = createContext<SwapData>({
    codeRequested: false,
    swapResponse: undefined,
    depositAddressIsFromAccount: false,
    withdrawType: undefined,
    swapTransaction: undefined,
    depositActionsResponse: undefined,
    recentNetworks: { sourceNetworks: [], destinationNetworks: [] },
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
    setSwapPath: (swapId: string, router: NextRouter) => void,
    setSwapDataFromQuery?: (swapData: SwapResponse | undefined) => void,
    removeSwapPath: (router: NextRouter) => void,
    resolveSwapDataFromQuery: (settings: LayerSwapAppSettings, selectedSourceAddress: string | undefined, quoteData: Quote, destination_address?: string) => SwapResponse | undefined
}

export type SwapData = {
    codeRequested: boolean,
    swapResponse?: SwapResponse,
    swapApiError?: ApiError,
    depositAddressIsFromAccount?: boolean,
    depositActionsResponse?: DepositAction[],
    withdrawType: WithdrawType | undefined,
    swapTransaction: SwapTransaction | undefined,
    swapDataFromQuery?: SwapResponse | undefined,
    selectedSourceAccount?: { wallet: Wallet, address: string }
    recentNetworks?: RecentNetworks
}

export type RecentNetworks = {
    sourceNetworks: string[],
    destinationNetworks: string[]
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
    const [swapDataFromQuery, setSwapDataFromQuery] = useState<SwapResponse | undefined>(undefined)

    const [recentNetworks, setRecentNetworks] = usePersistedState<RecentNetworks>({ sourceNetworks: [], destinationNetworks: [] }, 'recentNetworks', 'localStorage');
    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `/swaps/${swapId}?exclude_deposit_actions=true`
    const [interval, setInterval] = useState(0)
    const { data: swapData, mutate, error } = useSWR<ApiResponse<SwapResponse>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

    const resolveSwapDataFromQuery = (settings: LayerSwapAppSettings, selectedSourceAddress: string | undefined, quoteData: Quote, destination_address?: string): SwapResponse | undefined => {
        const data = _resolveSwapDataFromQuery(settings, selectedSourceAddress, quoteData, destination_address)
        if (!data) {
            setSwapDataFromQuery(undefined)
            return undefined
        }
        setSwapDataFromQuery(data)
        return
    }

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

    const swapResponse = swapId ? swapData?.data : swapDataFromQuery;

    const sourceIsSupported = swapResponse && WalletIsSupportedForSource({
        providers: providers,
        sourceNetwork: swapResponse.swap.source_network,
        sourceWallet: selectedSourceAccount?.wallet
    })

    const use_deposit_address = swapData?.data?.swap?.use_deposit_address
    const deposit_actions_endpoint = `/swaps/${swapId}/deposit_actions${(use_deposit_address || !selectedSourceAccount || !sourceIsSupported) ? "" : `?source_address=${selectedSourceAccount?.address}`}`

    const { data: depositActions } = useSWR<ApiResponse<DepositAction[]>>(swapData ? deposit_actions_endpoint : null, layerswapApiClient.fetcher)

    const depositActionsResponse = depositActions?.data
    const swapStatus = swapResponse?.swap.status;

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
            source_network: sourceLayer?.name,
            destination_network: destinationLayer?.name,
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

        setRecentNetworks(updateRecentNetworks(recentNetworks, fromExchange ? undefined : from.name, to.name));

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
        setSwapPath,
        removeSwapPath,
        resolveSwapDataFromQuery,
        setSwapDataFromQuery
    };
    return (
        <SwapDataStateContext.Provider value={{
            withdrawType,
            codeRequested,
            swapTransaction,
            depositAddressIsFromAccount: !!depositAddressIsFromAccount,
            swapResponse: swapResponse,
            swapApiError: error,
            depositActionsResponse,
            selectedSourceAccount,
            swapDataFromQuery,
            recentNetworks
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

const updateRecentNetworks = (
    prev: RecentNetworks,
    fromName?: string,
    toName?: string
): RecentNetworks => {
    const moveToEnd = (array: string[], item: string): string[] => {
        const filtered = array.filter(i => i !== item);
        return [...filtered, item];
    };

    return {
        sourceNetworks: fromName
            ? moveToEnd(prev.sourceNetworks || [], fromName)
            : (prev.sourceNetworks || []),
        destinationNetworks: toName
            ? moveToEnd(prev.destinationNetworks || [], toName)
            : (prev.destinationNetworks || []),
    };
}

const WalletIsSupportedForSource = ({ providers, sourceNetwork, sourceWallet }: { providers: WalletProvider[] | undefined, sourceWallet: Wallet | undefined, sourceNetwork: Network | undefined }) => {
    const isSupported = sourceWallet && providers?.find(p => p.name === sourceWallet.providerName)?.asSourceSupportedNetworks?.some(n => n === sourceNetwork?.name) || false
    return isSupported
}

const _resolveSwapDataFromQuery = (settings: LayerSwapAppSettings, selectedSourceAddress: string | undefined, quoteData: Quote, destination_address?: string): SwapResponse | undefined => {
    const { quote, refuel } = quoteData || {};
    const { sourceRoutes, destinationRoutes } = settings;
    const urlParams = new URLSearchParams(window.location.search);
    const fromName = urlParams.get('from');
    const toName = urlParams.get('to');
    const amount = urlParams.get('amount');
    const destAddress = destination_address || urlParams.get('destination_address') || '';
    const depositMethod = urlParams.get('depositMethod') || 'wallet';
    const fromCurrencySymbol = urlParams.get('fromAsset');
    const toCurrencySymbol = urlParams.get('toAsset');

    const from = sourceRoutes.find(n => n.name === fromName);
    const to = destinationRoutes.find(n => n.name === toName);
    const fromCurrency = fromCurrencySymbol ? from?.tokens.find(t => t.symbol === fromCurrencySymbol) : undefined;
    const toCurrency = toCurrencySymbol ? to?.tokens.find(t => t.symbol === toCurrencySymbol) : undefined;

    if (!from || !to || !fromCurrency || !toCurrency || !amount) return undefined

    const swap: SwapResponse = {
        swap: {
            id: '',
            created_date: new Date().toISOString(),
            status: SwapStatus.UserTransferPending,
            source_network: from,
            destination_network: to,
            source_token: fromCurrency,
            destination_token: toCurrency,
            requested_amount: Number(amount),
            destination_address: destAddress,
            use_deposit_address: depositMethod === 'deposit_address',
            source_address: selectedSourceAddress || '',
            transactions: [],
            exchange_account_connected: false,
            metadata: {
                reference_id: null,
                app: null,
                sequence_number: 0
            }
        },
        quote,
        refuel
    }

    return swap
}

const setSwapPath = (swapId: string, router: NextRouter) => {
    //TODO: as path should be without basepath and host
    const basePath = router?.basePath || ""
    var swapURL = window.location.protocol + "//"
        + window.location.host + `${basePath}/swap/${swapId}`;
    const params = resolvePersistantQueryParams(router.query)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            swapURL += `?${search}`
    }

    window.history.pushState({ ...window.history.state, as: swapURL, url: swapURL }, '', swapURL);
}

const removeSwapPath = (router: NextRouter) => {
    const basePath = router?.basePath || ""
    let homeURL = window.location.protocol + "//"
        + window.location.host + basePath

    const params = resolvePersistantQueryParams(router.query)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            homeURL += `?${search}`
    }
    window.history.replaceState({ ...window.history.state, as: router.asPath, url: homeURL }, '', homeURL);
}