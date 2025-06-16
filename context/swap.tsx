import { Context, useCallback, useEffect, useState, createContext, useContext } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, PublishedSwapTransactions, SwapTransaction, WithdrawType, SwapResponse, DepositAction } from '../lib/apiClients/layerSwapApiClient';
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

export const SwapDataStateContext = createContext<SwapData>({
    codeRequested: false,
    swapResponse: undefined,
    depositAddressIsFromAccount: false,
    withdrawType: undefined,
    swapTransaction: undefined,
    depositActionsResponse: undefined,
});

export const SwapDataUpdateContext = createContext<UpdateInterface | null>(null);

export type UpdateInterface = {
    createSwap: (values: SwapFormValues, query: QueryParams, partner?: Partner) => Promise<string>,
    setCodeRequested: (codeSubmitted: boolean) => void;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<ApiResponse<SwapResponse>>
    setDepositAddressIsFromAccount: (value: boolean) => void,
    setWithdrawType: (value: WithdrawType) => void
    setSwapId: (value: string) => void
    setSelectedSourceAccount: (value: { wallet: Wallet, address: string } | undefined) => void
    setSwapPath: (swapId: string, router: NextRouter) => void,
    removeSwapPath: (router: NextRouter) => void
}

export type SwapData = {
    codeRequested: boolean,
    swapResponse?: SwapResponse,
    swapApiError?: ApiError,
    depositAddressIsFromAccount?: boolean,
    depositActionsResponse?: DepositAction[],
    withdrawType: WithdrawType | undefined,
    swapTransaction: SwapTransaction | undefined,
    selectedSourceAccount?: { wallet: Wallet, address: string }
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

    const { quote: quoteData } = useQuote()
    const { quote } = quoteData || {}

    // const swapDataFromQuote: SwapResponse = quote && {
    //     ...quoteData,
    //     swap: {
    //         status: SwapStatus.Created,
    //         source_network: quote.source_network,
    //         destination_network: quote?.destination_network,
    //         source_token: quote?.source_token,
    //         destination_token: quote?.destination_token,
    //         amount: quote?.,
    //         destination_address: "",
    //         use_deposit_address: false,
    //         refuel: false,
    //         source_address: selectedSourceAccount?.address || undefined
    //     }
    // }

    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `/swaps/${swapId}?exclude_deposit_actions=true`
    const [interval, setInterval] = useState(0)
    const { data: swapData, mutate, error } = useSWR<ApiResponse<SwapResponse>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

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

    const swapResponse = swapData?.data

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

        const { to, fromCurrency, toCurrency, from, refuel, fromExchange, toExchange, depositMethod, amount, destination_address } = values

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
            destination_exchange: toExchange?.name,
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

        const swapId = swapResponse?.data?.swap.id;
        if (!swapId)
            throw new Error("Could not create swap")

        return swapId;
    }, [selectedSourceAccount])

    const updateFns: UpdateInterface = {
        createSwap: createSwap,
        setCodeRequested: setCodeRequested,
        setInterval: setInterval,
        mutateSwap: mutate,
        setDepositAddressIsFromAccount: setDepositAddressIsFromAccount,
        setWithdrawType,
        setSwapId,
        setSelectedSourceAccount: handleChangeSelectedSourceAccount,
        setSwapPath,
        removeSwapPath
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
            selectedSourceAccount
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
    const updateFns = useContext<UpdateInterface>(SwapDataUpdateContext as Context<UpdateInterface>);
    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}

const WalletIsSupportedForSource = ({ providers, sourceNetwork, sourceWallet }: { providers: WalletProvider[] | undefined, sourceWallet: Wallet | undefined, sourceNetwork: Network | undefined }) => {
    const isSupported = sourceWallet && providers?.find(p => p.name === sourceWallet.providerName)?.asSourceSupportedNetworks?.some(n => n === sourceNetwork?.name) || false
    return isSupported
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