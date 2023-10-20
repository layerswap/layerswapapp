import { Context, useCallback, useEffect, useState, createContext, useContext } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, SwapItem, PublishedSwapTransactions, PublishedSwapTransactionStatus, SwapTransaction, WithdrawType } from '../lib/layerSwapApiClient';
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { QueryParams } from '../Models/QueryParams';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { Partner } from '../Models/Partner';
import { ApiError } from '../Models/ApiError';
import { useAccount } from 'wagmi';
import { BaseL2Asset, ExchangeAsset } from '../Models/Layer';

export const SwapDataStateContext = createContext<SwapData>({
    codeRequested: false,
    swap: undefined,
    addressConfirmed: false,
    depositeAddressIsfromAccount: false,
    withdrawType: undefined,
    swapTransaction: undefined,
    selectedAssetNetwork: undefined
});
export const SwapDataUpdateContext = createContext<UpdateInterface | null>(null);

export type UpdateInterface = {
    createSwap: (values: SwapFormValues, query: QueryParams, partner?: Partner) => Promise<string | undefined>,
    setCodeRequested: (codeSubmitted: boolean) => void;
    cancelSwap: (swapId: string) => Promise<void>;
    setAddressConfirmed: (value: boolean) => void;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<ApiResponse<SwapItem>>
    setWalletAddress: (value: string) => void,
    setDepositeAddressIsfromAccount: (value: boolean) => void,
    setWithdrawType: (value: WithdrawType) => void
    setSwapPublishedTx: (swapId: string, status: PublishedSwapTransactionStatus, txHash: string) => void;
    setSelectedAssetNetwork: (assetNetwork: ExchangeAsset | BaseL2Asset) => void
}

export type SwapData = {
    codeRequested: boolean,
    swap?: SwapItem,
    swapApiError?: ApiError,
    addressConfirmed: boolean,
    depositeAddressIsfromAccount: boolean,
    withdrawType: WithdrawType | undefined,
    swapTransaction: SwapTransaction | undefined,
    selectedAssetNetwork: ExchangeAsset | BaseL2Asset | undefined
}

export function SwapDataProvider({ children }) {
    const [addressConfirmed, setAddressConfirmed] = useState<boolean>(false)
    const [codeRequested, setCodeRequested] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [walletAddress, setWalletAddress] = useState<string>()
    const [depositeAddressIsfromAccount, setDepositeAddressIsfromAccount] = useState<boolean>()
    const router = useRouter();
    const swapId = router.query.swapId?.toString()
    const { address } = useAccount()
    const { layers } = useSettingsState()


    const layerswapApiClient = new LayerSwapApiClient()
    const apiVersion = LayerSwapApiClient.apiVersion
    const swap_details_endpoint = `/swaps/${swapId}?version=${apiVersion}`
    const [interval, setInterval] = useState(0)
    const { data: swapResponse, mutate, error } = useSWR<ApiResponse<SwapItem>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

    const [swapTransaction, setSwapTransaction] = useState<SwapTransaction>()
    const source_exchange = layers.find(n => n?.internal_name?.toLowerCase() === swapResponse?.data?.source_exchange?.toLowerCase())

    const exchangeAssets = source_exchange?.assets?.filter(a => a?.asset === swapResponse?.data?.source_network_asset && a?.network?.status !== "inactive")
    const source_network = layers.find(n => n.internal_name?.toLowerCase() === swapResponse?.data?.source_network?.toLowerCase())
    const defaultSourceNetwork = (exchangeAssets?.find(sn => sn?.is_default) || exchangeAssets?.[0] || source_network?.assets?.[0])
    const [selectedAssetNetwork, setSelectedAssetNetwork] = useState<ExchangeAsset | BaseL2Asset | undefined>(defaultSourceNetwork)

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

        const { to, currency, from, refuel } = values

        if (!to || !currency || !from || !values.amount || !values.destination_address)
            throw new Error("Form data is missing")
        const getStarknet = (await import('get-starknet-core')).getStarknet;
        const starknet = getStarknet()

        const sourceLayer = from
        const destinationLayer = to
        const starknetAddress = (await starknet?.getLastConnectedWallet())?.account?.address

        const data: CreateSwapParams = {
            amount: values.amount,
            source: sourceLayer?.internal_name,
            destination: destinationLayer?.internal_name,
            source_asset: currency.asset,
            destination_asset: currency.asset,
            source_address: address || starknetAddress,
            destination_address: values.destination_address,
            app_name: partner ? query?.addressSource : undefined,
            reference_id: query.externalId,
        }

        if (!destinationLayer?.isExchange) {
            data.refuel = !!refuel
        }

        const swapResponse = await layerswapApiClient.CreateSwapAsync(data)
        if (swapResponse?.error) {
            throw swapResponse?.error
        }

        const swapId = swapResponse?.data?.swap_id;
        return swapId;
    }, [])

    const cancelSwap = useCallback(async (swapId: string) => {
        await layerswapApiClient.CancelSwapAsync(swapId)
    }, [router])

    const updateFns: UpdateInterface = {
        createSwap: createSwap,
        setCodeRequested: setCodeRequested,
        cancelSwap: cancelSwap,
        setAddressConfirmed: setAddressConfirmed,
        setInterval: setInterval,
        mutateSwap: mutate,
        setDepositeAddressIsfromAccount,
        setWalletAddress,
        setWithdrawType,
        setSelectedAssetNetwork
    };
    return (
        <SwapDataStateContext.Provider value={{
            withdrawType,
            codeRequested,
            addressConfirmed,
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