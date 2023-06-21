import React, { useCallback, useEffect, useState } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, SwapType, SwapItem, PublishedSwapTransactions, PublishedSwapTransactionStatus, SwapTransaction, WithdrawType } from '../lib/layerSwapApiClient';
import { useRouter } from 'next/router';
import { useQueryState } from './query';
import { useSettingsState } from './settings';
import { QueryParams } from '../Models/QueryParams';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { Partner } from '../Models/Partner';
import { ApiError } from '../Models/ApiError';
import { useAccount } from 'wagmi';
import { getStarknet } from 'get-starknet-core';

const SwapDataStateContext = React.createContext<SwapData>({ codeRequested: false, swap: undefined, addressConfirmed: false, walletAddress: "", depositeAddressIsfromAccount: false, withdrawType: undefined, swapTransaction: undefined });
const SwapDataUpdateContext = React.createContext<UpdateInterface | null>(null);

type UpdateInterface = {
    createSwap: (values: SwapFormValues, query: QueryParams, partner: Partner) => Promise<string>,
    setCodeRequested(codeSubmitted: boolean): void;
    cancelSwap: (swapId: string) => Promise<void>;
    setAddressConfirmed: (value: boolean) => void;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<ApiResponse<SwapItem>>
    setWalletAddress: (value: string) => void,
    setDepositeAddressIsfromAccount: (value: boolean) => void,
    setWithdrawType: (value: WithdrawType) => void
    setSwapPublishedTx: (swapId: string, status: PublishedSwapTransactionStatus, txHash: string) => void;
}

type SwapData = {
    codeRequested: boolean,
    swap?: SwapItem,
    swapApiError?: ApiError,
    addressConfirmed: boolean,
    depositeAddressIsfromAccount: boolean,
    walletAddress: string,
    withdrawType: WithdrawType,
    swapTransaction: SwapTransaction
}

export function SwapDataProvider({ children }) {
    const [addressConfirmed, setAddressConfirmed] = useState<boolean>(false)
    const [codeRequested, setCodeRequested] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [walletAddress, setWalletAddress] = useState<string>()
    const [depositeAddressIsfromAccount, setDepositeAddressIsfromAccount] = useState<boolean>()
    const router = useRouter();
    const swapId = router.query.swapId?.toString()
    const query = useQueryState();
    const { address } = useAccount()
    const starknet = getStarknet()

    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `/swaps/${swapId}`
    const [interval, setInterval] = useState(0)
    const { data: swapResponse, mutate, error } = useSWR<ApiResponse<SwapItem>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

    const [swapTransaction, setSwapTransaction] = useState<SwapTransaction>()

    useEffect(() => {
        const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
        const txForSwap = data?.[swapId];
        setSwapTransaction(txForSwap)
    }, [swapId])

    const createSwap = useCallback(async (values: SwapFormValues, query: QueryParams, partner: Partner) => {
        if (!values)
            throw new Error("No swap data")

        const { to, currency, from, refuel } = values

        if (!to || !currency || !from)
            throw new Error("Form data is missing")

        const sourceLayer = from
        const destinationLayer = to
        const starknetAddress = (await starknet?.getLastConnectedWallet())?.account?.address

        const data: CreateSwapParams = {
            amount: values.amount,
            source: sourceLayer?.internal_name,
            destination: destinationLayer?.internal_name,
            asset: currency.asset,
            source_address: address || starknetAddress,
            destination_address: values.destination_address,
            app_name: partner ? query?.addressSource : undefined,
            reference_id: query.externalId,
        }

        if (!destinationLayer?.isExchange) {
            data.refuel = refuel
        }

        const swapResponse = await layerswapApiClient.CreateSwapAsync(data)
        if (swapResponse?.error) {
            throw swapResponse?.error
        }

        const swapId = swapResponse.data.swap_id;
        return swapId;
    }, [])

    const cancelSwap = useCallback(async (swapId: string) => {
        await layerswapApiClient.CancelSwapAsync(swapId)
    }, [router])

    const setSwapPublishedTx = useCallback(async (Id: string, status: PublishedSwapTransactionStatus, txHash: string) => {
        const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
        const txForSwap = data?.[Id] ?? { hash: txHash, status: PublishedSwapTransactionStatus.Pending };
        txForSwap.status = status;
        data[Id] = txForSwap;
        localStorage.setItem('swapTransactions', JSON.stringify(data))
        setSwapTransaction(txForSwap)
    }, [swapResponse])


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
        setSwapPublishedTx
    };
    return (
        <SwapDataStateContext.Provider value={{ withdrawType, depositeAddressIsfromAccount, swap: swapResponse?.data, swapApiError: error, codeRequested, addressConfirmed, walletAddress, swapTransaction }}>
            <SwapDataUpdateContext.Provider value={updateFns}>
                {children}
            </SwapDataUpdateContext.Provider>
        </SwapDataStateContext.Provider>
    );
}

export function useSwapDataState() {
    const data = React.useContext(SwapDataStateContext);

    if (data === undefined) {
        throw new Error('swapData must be used within a SwapDataProvider');
    }
    return data;
}

export function useSwapDataUpdate() {
    const updateFns = React.useContext<UpdateInterface>(SwapDataUpdateContext);
    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}