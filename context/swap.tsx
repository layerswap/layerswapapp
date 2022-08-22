import React, { useCallback, useState } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { BransferApiClient } from '../lib/bransferApiClients';
import LayerSwapApiClient, { CreateSwapParams, SwapItemResponse } from '../lib/layerSwapApiClient';
import { useAuthDataUpdate } from './authContext';
import TokenService from '../lib/TokenService';

const SwapDataStateContext = React.createContext<SwapData>(null);
const SwapDataUpdateContext = React.createContext<UpdateInterface>(null);

type UpdateInterface = {
    updateSwapFormData: (value: React.SetStateAction<SwapFormValues>) => void,
    createSwap: (data: CreateSwapParams) => Promise<SwapItemResponse>,
    //TODO this is stupid need to clean data in confirm step or even do not store it
    clearSwap: () => void,
    processPayment: (swap: SwapItemResponse, twoFactorCode?: string) => void,
    getSwap: (id: string) => Promise<SwapItemResponse>
}

type SwapData = {
    swapFormData: SwapFormValues,
    swap: SwapItemResponse
}

export function SwapDataProvider({ children }) {
    const [swapFormData, setSwapFormData] = React.useState<SwapFormValues>();
    const [swap, setSwap] = useState<SwapItemResponse>()

    const { getAuthData } = useAuthDataUpdate();

    const updateFns: UpdateInterface = {
        clearSwap: () => setSwap(undefined),
        updateSwapFormData: setSwapFormData,
        createSwap: useCallback(async (data: CreateSwapParams) => {
            try {
                const layerswapApiClient = new LayerSwapApiClient()
                const authData = getAuthData()
                const swap = await layerswapApiClient.createSwap({
                    Amount: Number(swapFormData.amount),
                    Exchange: swapFormData.exchange?.id,
                    Network: swapFormData.network.id,
                    currency: swapFormData.currency.baseObject.asset,
                    destination_address: swapFormData.destination_address,
                    to_exchange: swapFormData.swapType === "offramp"
                }, authData?.access_token)

                if (swap?.is_success !== true)
                    throw new Error(swap.error)

                const swapId = swap.data.swap_id;
                const swapDetails = await layerswapApiClient.getSwapDetails(swapId, authData?.access_token)
                setSwap(swapDetails)
                return swapDetails;
            }
            catch (e) {
                throw e
            }
        }, [swapFormData, getAuthData]),
        getSwap: useCallback(async (id) => {
            const authData = TokenService.getAuthData();
            const layerswapApiClient = new LayerSwapApiClient()
            const swapDetails = await layerswapApiClient.getSwapDetails(id, authData?.access_token)
            setSwap(swapDetails)
            return swapDetails
        }, []),
        processPayment: useCallback(async (swap: SwapItemResponse, twoFactorCode?: string) => {
            const authData = getAuthData()
            const bransferApiClient = new BransferApiClient()
            const layerswapApiClient = new LayerSwapApiClient()
            const prcoessPaymentReponse = await bransferApiClient.ProcessPayment(swap.data.payment.id, authData?.access_token, twoFactorCode)
            if (!prcoessPaymentReponse.is_success)
                throw new Error(prcoessPaymentReponse.errors)
            const swapDetails = await layerswapApiClient.getSwapDetails(swap.data.id, authData?.access_token)
            setSwap(swapDetails)
        }, [getAuthData]),
    };

    return (
        <SwapDataStateContext.Provider value={{ swapFormData, swap }}>
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