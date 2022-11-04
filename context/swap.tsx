import React, { useCallback, useEffect, useState } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { CreateSwapParams, SwapItemResponse, SwapType } from '../lib/layerSwapApiClient';
import { useAuthDataUpdate } from './authContext';
import { useRouter } from 'next/router';
import { useQueryState } from './query';
import { useSettingsState } from './settings';
import { QueryParams } from '../Models/QueryParams';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import useSWR, { KeyedMutator } from 'swr';

const SwapDataStateContext = React.createContext<SwapData>({ codeRequested: false, swap: undefined, swapFormData: undefined, addressConfirmed: false, walletAddress: "" });
const SwapDataUpdateContext = React.createContext<UpdateInterface | null>(null);

type UpdateInterface = {
    updateSwapFormData: (value: React.SetStateAction<SwapFormValues>) => void,
    createAndProcessSwap: (TwoFACode?: string) => Promise<string>,
    //TODO this is stupid need to clean data in confirm step or even do not store it
    clearSwap: () => void,
    processPayment: (swapId: string, twoFactorCode?: string) => void,
    setCodeRequested(codeSubmitted: boolean): void;
    cancelSwap: (swapId: string) => Promise<void>;
    setAddressConfirmed: (value: boolean) => void;
    setInterval: (value: number) => void,
    mutateSwap: KeyedMutator<SwapItemResponse>,
    setWalletAddress: (value: string) => void,
}

type SwapData = {
    codeRequested: boolean,
    swapFormData?: SwapFormValues,
    swap?: SwapItemResponse,
    addressConfirmed: boolean,
    walletAddress: string
}

export function SwapDataProvider({ children }) {
    const [swapFormData, setSwapFormData] = useState<SwapFormValues>();
    const [addressConfirmed, setAddressConfirmed] = useState<boolean>(false)
    const [codeRequested, setCodeRequested] = useState<boolean>(false)
    const [walletAddress, setWalletAddress] = useState<string>()
    const router = useRouter();
    const [swapId, setSwapId] = useState(router.query.swapId?.toString())

    const layerswapApiClient = new LayerSwapApiClient()
    const swap_details_endpoint = `${LayerSwapApiClient.apiBaseEndpoint}/api/swaps/${swapId}`
    const [interval, setInterval] = useState(0)
    const { data: swap, mutate } = useSWR<SwapItemResponse>(swapId ? swap_details_endpoint : null, layerswapApiClient.fetcher, { refreshInterval: interval })

    const { getAuthData } = useAuthDataUpdate();
    const query = useQueryState();
    const settings = useSettingsState();

    useEffect(() => {
        setAddressConfirmed(false)
    }, [swapFormData?.destination_address, swapFormData?.exchange])

    useEffect(() => {
        setCodeRequested(false)
    }, [swapFormData?.exchange])

    const createSwap = useCallback(async (formData: SwapFormValues, query: QueryParams, settings: LayerSwapSettings) => {
        if (!formData)
            throw new Error("No swap data")

        const { network, currency, exchange } = formData

        if (!network || !currency || !exchange)
            throw new Error("Form data is missing")

        try {
            const data: CreateSwapParams = {
                amount: Number(formData.amount),
                exchange: exchange?.id,
                network: network.id,
                asset: currency.baseObject.asset,
                destination_address: formData.destination_address,
                type: (formData.swapType === SwapType.OnRamp ? 0 : 1), /// TODO create map for sap types
                partner: settings.data.partners.find(p => p.is_enabled && p.internal_name?.toLocaleLowerCase() === query.addressSource?.toLocaleLowerCase())?.internal_name,
                external_id: query.externalId
            }

            const swap = await layerswapApiClient.createSwap(data)

            if (swap?.error) {
                throw new Error(swap?.error?.message)
            }

            const swapId = swap.data.swap_id;
            return swapId;
        }
        catch (e) {
            throw e
        }
    }, [])

    const cancelSwap = useCallback(async (swapId: string) => {
        await layerswapApiClient.CancelSwap(swapId)
    }, [router, swapFormData])

    const processPayment = useCallback(async (swapId: string, twoFactorCode?: string) => {
        const prcoessPaymentReponse = await layerswapApiClient.ProcessPayment(swapId, twoFactorCode)
        if (prcoessPaymentReponse.error)
            throw new Error(prcoessPaymentReponse.error)
    }, [getAuthData])

    const createAndProcessSwap = useCallback(async (TwoFACode?: string) => {
        const newSwapId = await createSwap(swapFormData, query, settings)
        setSwapId(newSwapId)
        await processPayment(newSwapId, TwoFACode)
        return newSwapId
    }, [swap, swapFormData, query, settings])

    const updateFns: UpdateInterface = {
        clearSwap: () => { setSwapId(undefined) },
        updateSwapFormData: setSwapFormData,
        createAndProcessSwap: createAndProcessSwap,
        processPayment: processPayment,
        setCodeRequested: setCodeRequested,
        cancelSwap: cancelSwap,
        setAddressConfirmed: setAddressConfirmed,
        setInterval: setInterval,
        mutateSwap: mutate,
        setWalletAddress
    };

    return (
        <SwapDataStateContext.Provider value={{ swapFormData, swap, codeRequested, addressConfirmed, walletAddress }}>
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