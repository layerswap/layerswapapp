import { Context, useCallback, useEffect, useState, createContext, useContext } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, PublishedSwapTransactions, SwapTransaction, WithdrawType, SwapResponse } from '../lib/layerSwapApiClient';
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { QueryParams } from '../Models/QueryParams';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { Partner } from '../Models/Partner';
import { ApiError } from '../Models/ApiError';
import { ResolvePollingInterval } from '../components/utils/SwapStatus';
import { Token } from '../Models/Network';

export const SwapDataStateContext = createContext<SwapData>({
    codeRequested: false,
    swapResponse: undefined,
    addressConfirmed: false,
    depositeAddressIsfromAccount: false,
    withdrawType: undefined,
    swapTransaction: undefined,
    selectedAssetNetwork: undefined,
});

export const SwapDataUpdateContext = createContext<UpdateInterface | null>(null);

export type UpdateInterface = {
    createSwap: (values: SwapFormValues, source_address: string | undefined, query: QueryParams, partner?: Partner) => Promise<string>,
    setCodeRequested: (codeSubmitted: boolean) => void;
    setAddressConfirmed: (value: boolean) => void;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<ApiResponse<SwapResponse>>
    setDepositeAddressIsfromAccount: (value: boolean) => void,
    setWithdrawType: (value: WithdrawType) => void
    setSelectedAssetNetwork: (assetNetwork: Token) => void
    setSwapId: (value: string) => void
}

export type SwapData = {
    codeRequested: boolean,
    swapResponse?: SwapResponse,
    swapApiError?: ApiError,
    addressConfirmed: boolean,
    depositeAddressIsfromAccount: boolean,
    withdrawType: WithdrawType | undefined,
    swapTransaction: SwapTransaction | undefined,
    selectedAssetNetwork: Token | undefined,
}

export function SwapDataProvider({ children }) {
    const [addressConfirmed, setAddressConfirmed] = useState<boolean>(false)
    const [codeRequested, setCodeRequested] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [depositeAddressIsfromAccount, setDepositeAddressIsfromAccount] = useState<boolean>()
    const router = useRouter();
    const [swapId, setSwapId] = useState<string | undefined>(router.query.swapId?.toString())
    const { networks: layers } = useSettingsState()

    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `/swaps/${swapId}`
    const [interval, setInterval] = useState(0)
    const { data: swapData, mutate, error } = useSWR<ApiResponse<SwapResponse>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

    const swapResponse = swapData?.data

    const [swapTransaction, setSwapTransaction] = useState<SwapTransaction>()
    const source_exchange = layers.find(n => n?.name?.toLowerCase() === swapResponse?.swap.source_exchange?.name.toLowerCase())

    const exchangeAssets = source_exchange?.tokens?.filter(a => a?.symbol === swapResponse?.swap.source_token.symbol)
    const source_network = layers.find(n => n.name?.toLowerCase() === swapResponse?.swap.source_network?.name.toLowerCase())
    const defaultSourceNetwork = exchangeAssets?.[0] || source_network?.tokens?.[0]
    const [selectedAssetNetwork, setSelectedAssetNetwork] = useState<Token | undefined>(defaultSourceNetwork)

    const swapStatus = swapResponse?.swap.status;
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

    const createSwap = useCallback(async (values: SwapFormValues, source_address: string, query: QueryParams, partner: Partner) => {
        if (!values)
            throw new Error("No swap data")

        const { to, fromCurrency, toCurrency, from, refuel, fromExchange, toExchange, depositMethod, amount, destination_address } = values

        if (!to || !fromCurrency || !toCurrency || !from || !amount || !destination_address || !depositMethod)
            throw new Error("Form data is missing")

        const sourceLayer = from
        const destinationLayer = to

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
            deposit_mode: depositMethod!,
            source_address
        }

        const swapResponse = await layerswapApiClient.CreateSwapAsync(data)
        if (swapResponse?.error) {
            throw swapResponse?.error
        }

        const swapId = swapResponse?.data?.swap.id;
        if (!swapId)
            throw new Error("Could not create swap")

        return swapId;
    }, [])

    const updateFns: UpdateInterface = {
        createSwap: createSwap,
        setCodeRequested: setCodeRequested,
        setAddressConfirmed: setAddressConfirmed,
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
            addressConfirmed,
            swapTransaction,
            selectedAssetNetwork,
            depositeAddressIsfromAccount: !!depositeAddressIsfromAccount,
            swapResponse: swapResponse,
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