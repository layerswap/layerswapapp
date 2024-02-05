import { Context, useCallback, useEffect, useState, createContext, useContext, useMemo } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, SwapItem, PublishedSwapTransactions, SwapTransaction, WithdrawType } from '../lib/layerSwapApiClient';
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { QueryParams } from '../Models/QueryParams';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { Partner } from '../Models/Partner';
import { ApiError } from '../Models/ApiError';
import { ResolvePollingInterval } from '../components/utils/SwapStatus';
import { NetworkCurrency } from '../Models/CryptoNetwork';

export const SwapDataStateContext = createContext<SwapData>({
    codeRequested: false,
    swap: undefined,
    depositeAddressIsfromAccount: false,
    withdrawType: undefined,
    swapTransaction: undefined,
    selectedAssetNetwork: undefined
});
export const SwapDataUpdateContext = createContext<UpdateInterface | null>(null);

export type UpdateInterface = {
    createSwap: (values: SwapFormValues, query: QueryParams, partner?: Partner) => Promise<string>,
    setCodeRequested: (codeSubmitted: boolean) => void;
    cancelSwap: (swapId: string) => Promise<void>;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<ApiResponse<SwapItem>>
    setDepositeAddressIsfromAccount: (value: boolean) => void,
    setWithdrawType: (value: WithdrawType) => void
    setSelectedAssetNetwork: (assetNetwork: NetworkCurrency) => void
    setSwapId: (value: string) => void
}

export type SwapData = {
    codeRequested: boolean,
    swap?: SwapItem,
    swapApiError?: ApiError,
    depositeAddressIsfromAccount: boolean,
    withdrawType: WithdrawType | undefined,
    swapTransaction: SwapTransaction | undefined,
    selectedAssetNetwork: NetworkCurrency | undefined
}

export function SwapDataProvider({ children }) {
    const [codeRequested, setCodeRequested] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [depositeAddressIsfromAccount, setDepositeAddressIsfromAccount] = useState<boolean>()
    const router = useRouter();
    const [swapId, setSwapId] = useState<string | undefined>(router.query.swapId?.toString())
    const { layers } = useSettingsState()

    const layerswapApiClient = new LayerSwapApiClient()
    const apiVersion = LayerSwapApiClient.apiVersion
    const swap_details_endpoint = `/swaps/${swapId}?version=${apiVersion}`
    const [interval, setInterval] = useState(0)
    const { data: swapResponse, mutate, error } = useSWR<ApiResponse<SwapItem>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

    const [swapTransaction, setSwapTransaction] = useState<SwapTransaction>()
    const source_exchange = layers.find(n => n?.internal_name?.toLowerCase() === swapResponse?.data?.source_exchange?.toLowerCase())

    const exchangeAssets = source_exchange?.assets?.filter(a => a?.asset === swapResponse?.data?.source_network_asset)
    const source_network = layers.find(n => n.internal_name?.toLowerCase() === swapResponse?.data?.source_network?.toLowerCase())
    const defaultSourceNetwork = exchangeAssets?.[0] || source_network?.assets?.[0]
    const [selectedAssetNetwork, setSelectedAssetNetwork] = useState<NetworkCurrency | undefined>(defaultSourceNetwork)

    const swapStatus = swapResponse?.data?.status;
    useEffect(() => {
        if (swapStatus)
            setInterval(ResolvePollingInterval(swapStatus))
        return () => setInterval(0)
    }, [swapStatus])

    useEffect(() => {
        setSelectedAssetNetwork(defaultSourceNetwork)
    }, [defaultSourceNetwork])

    useEffect(() => {
        if (!swapId)
            return
        const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
        const txForSwap = data?.[swapId];
        setSwapTransaction(txForSwap)
    }, [swapId])

    const createSwap = useCallback(async (values: SwapFormValues, query: QueryParams, partner: Partner) => {
        if (!values)
            throw new Error("No swap data")

        const { to, fromCurrency, toCurrency, from, refuel, fromExchange, toExchange } = values

        if (!to || !fromCurrency || !toCurrency || !from || !values.amount || !values.destination_address)
            throw new Error("Form data is missing")

        const sourceLayer = from
        const destinationLayer = to

        const data: CreateSwapParams = {
            amount: values.amount,
            source: sourceLayer?.internal_name,
            destination: destinationLayer?.internal_name,
            source_asset: fromCurrency.asset,
            destination_asset: toCurrency.asset,
            source_exchange: fromExchange?.internal_name,
            destination_exchange: toExchange?.internal_name,
            destination_address: values.destination_address,
            //TODO query?.appNamemay be undefined
            app_name: partner ? query?.appName : (apiVersion === 'sandbox' ? 'LayerswapSandbox' : 'Layerswap'),
            reference_id: query.externalId,
            refuel: !!refuel
        }

        const swapResponse = await layerswapApiClient.CreateSwapAsync(data)
        if (swapResponse?.error) {
            throw swapResponse?.error
        }

        const swapId = swapResponse?.data?.swap_id;
        if (!swapId)
            throw new Error("Could not create swap")
        
        return swapId;
    }, [])

    const cancelSwap = useCallback(async (swapId: string) => {
        await layerswapApiClient.CancelSwapAsync(swapId)
    }, [router])

    const updateFns: UpdateInterface = {
        createSwap: createSwap,
        setCodeRequested: setCodeRequested,
        cancelSwap: cancelSwap,
        setInterval: setInterval,
        mutateSwap: mutate,
        setDepositeAddressIsfromAccount,
        setWithdrawType,
        setSelectedAssetNetwork,
        setSwapId
    };
    return (
        <SwapDataStateContext.Provider value={{
            withdrawType,
            codeRequested,
            swapTransaction,
            selectedAssetNetwork,
            depositeAddressIsfromAccount: !!depositeAddressIsfromAccount,
            swap: swapResponse?.data,
            swapApiError: error,
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