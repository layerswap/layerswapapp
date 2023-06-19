import React, { useCallback, useEffect, useState } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, SwapType, SwapItem, PublishedSwapTransactions, PublishedSwapTransactionStatus } from '../lib/layerSwapApiClient';
import { useRouter } from 'next/router';
import { useQueryState } from './query';
import { useSettingsState } from './settings';
import { QueryParams } from '../Models/QueryParams';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import useSWR, { KeyedMutator } from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import NetworkSettings, { DepositType } from '../lib/NetworkSettings';
import { Partner } from '../Models/Partner';
import { useAccount } from 'wagmi';
import { getStarknet } from 'get-starknet-core';

const SwapDataStateContext = React.createContext<SwapData>({ codeRequested: false, swap: undefined, swapFormData: undefined, addressConfirmed: false, walletAddress: "", depositeAddressIsfromAccount: false, withdrawManually: false });
const SwapDataUpdateContext = React.createContext<UpdateInterface | null>(null);

type UpdateInterface = {
    updateSwapFormData: (value: React.SetStateAction<SwapFormValues>) => void,
    createAndProcessSwap: (TwoFACode?: string) => Promise<string>,
    //TODO this is stupid need to clean data in confirm step or even do not store it
    clearSwap: () => void,
    setCodeRequested(codeSubmitted: boolean): void;
    cancelSwap: (swapId: string) => Promise<void>;
    setAddressConfirmed: (value: boolean) => void;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<ApiResponse<SwapItem>>
    setWalletAddress: (value: string) => void,
    setDepositeAddressIsfromAccount: (value: boolean) => void,
    setWithdrawManually: (value: boolean) => void
    setSwapPublishedTx: (swapId: string, status: PublishedSwapTransactionStatus, txHash: string) => void;
}

type SwapData = {
    codeRequested: boolean,
    swapFormData?: SwapFormValues,
    swap?: SwapItem,
    addressConfirmed: boolean,
    depositeAddressIsfromAccount: boolean,
    walletAddress: string,
    withdrawManually: boolean
}

export function SwapDataProvider({ children }) {
    const [swapFormData, setSwapFormData] = useState<SwapFormValues>();
    const [addressConfirmed, setAddressConfirmed] = useState<boolean>(false)
    const [codeRequested, setCodeRequested] = useState<boolean>(false)
    const [withdrawManually, setWithdrawManually] = useState<boolean>(false)
    const [walletAddress, setWalletAddress] = useState<string>()
    const [depositeAddressIsfromAccount, setDepositeAddressIsfromAccount] = useState<boolean>()
    const router = useRouter();
    const [swapId, setSwapId] = useState(router.query.swapId?.toString())
    const query = useQueryState();
    const settings = useSettingsState();
    const { address } = useAccount()
    const starknet = getStarknet()

    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `/swaps/${swapId}`
    const [interval, setInterval] = useState(0)
    const { data: swapResponse, mutate } = useSWR<ApiResponse<SwapItem>>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

    // Store pendingTransactionId in local storage, not the best solution
    if (swapResponse?.data) {
        const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
        const txForSwap = data?.[swapId];
        if (txForSwap && txForSwap.status == PublishedSwapTransactionStatus.Completed) {
            swapResponse.data.has_sucessfull_published_tx = true;
        }
    }

    const { data: partnerData } = useSWR<ApiResponse<Partner>>(query?.addressSource && `/apps?name=${query?.addressSource}`, layerswapApiClient.fetcher)
    const partner = query?.addressSource && partnerData?.data?.name?.toLowerCase() === query?.addressSource?.toLowerCase() ? partnerData?.data : undefined

    useEffect(() => {
        setCodeRequested(false)
    }, [swapFormData?.from])

    const createSwap = useCallback(async (formData: SwapFormValues, query: QueryParams, settings: LayerSwapSettings) => {
        if (!formData)
            throw new Error("No swap data")

        const { to, currency, from, refuel } = formData

        if (!to || !currency || !from)
            throw new Error("Form data is missing")

        const sourceLayer = from
        const destinationLayer = to
        const starknetAddress = (await starknet?.getLastConnectedWallet())?.account?.address

        const data: CreateSwapParams = {
            amount: formData.amount,
            source: sourceLayer?.internal_name,
            destination: destinationLayer?.internal_name,
            asset: currency.asset,
            source_address: address || starknetAddress,
            destination_address: formData.destination_address,
            // type: (formData.swapType === SwapType.OnRamp ? 0 : 1), /// TODO create map for sap types
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
    }, [partner])

    const cancelSwap = useCallback(async (swapId: string) => {
        await layerswapApiClient.CancelSwapAsync(swapId)
    }, [router, swapFormData])

    const setSwapPublishedTx = useCallback(async (swapId: string, status: PublishedSwapTransactionStatus, txHash: string) => {
        const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
        const txForSwap = data?.[swapId] ?? { hash: txHash, status: PublishedSwapTransactionStatus.Pending };
        txForSwap.status = status;
        data[swapId] = txForSwap;
        localStorage.setItem('swapTransactions', JSON.stringify(data))
        if (swapResponse?.data && txForSwap && txForSwap.status == PublishedSwapTransactionStatus.Completed) {
            swapResponse.data.has_sucessfull_published_tx = true;
        }
    }, [swapId, swapResponse])

    const createAndProcessSwap = useCallback(async (TwoFACode?: string) => {
        const newSwapId = await createSwap(swapFormData, query, settings)
        setSwapId(newSwapId)
        return newSwapId
    }, [swapResponse?.data, swapFormData, query, settings])

    const updateFns: UpdateInterface = {
        clearSwap: () => { setSwapId(undefined) },
        updateSwapFormData: setSwapFormData,
        createAndProcessSwap: createAndProcessSwap,
        setCodeRequested: setCodeRequested,
        cancelSwap: cancelSwap,
        setAddressConfirmed: setAddressConfirmed,
        setInterval: setInterval,
        mutateSwap: mutate,
        setDepositeAddressIsfromAccount,
        setWalletAddress,
        setWithdrawManually,
        setSwapPublishedTx
    };

    return (
        <SwapDataStateContext.Provider value={{ swapFormData, withdrawManually, depositeAddressIsfromAccount, swap: swapResponse?.data, codeRequested, addressConfirmed, walletAddress }}>
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