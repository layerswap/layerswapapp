import React, { useCallback, useEffect, useState } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { BransferApiClient, Payment } from '../lib/bransferApiClients';
import LayerSwapApiClient, { SwapDetailsResponse } from '../lib/layerSwapApiClient';
import { useAuthDataUpdate, useAuthState } from './auth';
import Router, { useRouter } from 'next/router'
import TokenService from '../lib/TokenService';
import { useInterval } from '../hooks/useInyterval';

const SwapDataStateContext = React.createContext<SwapData>(null);
const SwapDataUpdateContext = React.createContext<UpdateInterface>(null);

type UpdateInterface = {
    updateSwapFormData: (data: SwapFormValues) => void,
    createSwap: () => Promise<string>,
    // processPayment: (id: string) => void,
    getPayment: (id: string) => Promise<Payment>
    getSwap: (id: string) => Promise<{ swap: SwapDetailsResponse, payment: Payment }>
}

type SwapData = {
    swapFormData: SwapFormValues,
    payment: Payment,
    swap: SwapDetailsResponse
}

export function SwapDataProvider({ children }) {
    const [swapFormData, setSwapFormData] = React.useState<SwapFormValues>();
    const [swap, setSwap] = useState<SwapDetailsResponse>()
    const [payment, setPayment] = React.useState<Payment>();

    const { getAuthData } = useAuthDataUpdate();

    const router = useRouter()
    const { swapId } = router?.query || { swapId: payment?.data?.id }

    useEffect(() => {
        const authData = TokenService.getAuthData();
        if (authData && swapId && !swap)
            (async () => {
                const layerswapApiClient = new LayerSwapApiClient()
                const bransferApiClient = new BransferApiClient()
                const swapDetails = await layerswapApiClient.getSwapDetails(swapId?.toString(), authData?.access_token)
                setSwap(swapDetails)
                const payment = await bransferApiClient.GetPayment(swapDetails.external_payment_id, authData?.access_token)
                await setPayment(payment)
            })();
    }, [swapId])

    // useInterval(async () => {
    //     const { access_token } = TokenService.getAuthData() || {}

    //     if (paymentId && access_token) {
    //         const bransferApiClient = new BransferApiClient()
    //         const payment = await bransferApiClient.GetPayment(paymentId?.toString(), access_token)
    //         setPayment(payment)
    //     }

    // }, [paymentId], 5000)

    const updateFns = {
        updateSwapFormData: (data: SwapFormValues) => {
            setSwapFormData(data)
        },
        createSwap: useCallback(async () => {
            try {
                const layerswapApiClient = new LayerSwapApiClient()
                const authData = getAuthData()
                const swap = await layerswapApiClient.createSwap({
                    Amount: Number(swapFormData.amount),
                    Exchange: swapFormData.exchange?.id,
                    Network: swapFormData.network.id,
                    currency: swapFormData.currency.baseObject.asset,
                    destination_address: swapFormData.destination_address
                }, authData?.access_token)

                if (swap.statusCode !== 200)
                    throw new Error(swap.value)

                const swapId = swap.value?.swap_id;
                const swapDetails = await layerswapApiClient.getSwapDetails(swapId, authData?.access_token)
                setSwap(swapDetails)
                const bransferApiClient = new BransferApiClient()
                const payment = await bransferApiClient.GetPayment(swapDetails.external_payment_id, authData?.access_token)
                const prcoessPaymentReponse = await bransferApiClient.ProcessPayment(payment?.data?.id, authData?.access_token)
                if (!prcoessPaymentReponse.is_success)
                    throw new Error(prcoessPaymentReponse.errors)
                const processed_payment = await bransferApiClient.GetPayment(payment?.data?.id, authData?.access_token)
                await setPayment(processed_payment)
                return swapId;
            }
            catch (e) {
                throw e
            }
        }, [swapFormData, getAuthData]),
        getPayment: useCallback(async (id) => {
            const bransferApiClient = new BransferApiClient()
            const res = await bransferApiClient.GetPayment(id, TokenService.getAuthData().access_token)
            await setPayment(res)
            return payment;
        }, []),
        getSwap: useCallback(async (id) => {
            const authData = TokenService.getAuthData();
            const layerswapApiClient = new LayerSwapApiClient()
            const bransferApiClient = new BransferApiClient()
            const swapDetails = await layerswapApiClient.getSwapDetails(swapId?.toString(), authData?.access_token)
            setSwap(swapDetails)
            const payment = await bransferApiClient.GetPayment(swapDetails.external_payment_id, authData?.access_token)
            await setPayment(payment)
            return { swap: swapDetails, payment: payment }
        }, []),
        // processPayment: useCallback(async (id) => {
        //     const authData = getAuthData()
        //     const bransferApiClient = new BransferApiClient()
        //     const prcoessPaymentReponse = await bransferApiClient.ProcessPayment(id, authData?.access_token)
        //     if (!prcoessPaymentReponse.is_success)
        //         throw new Error(prcoessPaymentReponse.errors)
        //     const payment = await bransferApiClient.GetPayment(id, authData?.access_token)
        //     await setPayment(payment)
        // }, [getAuthData]),
    };

    return (
        <SwapDataStateContext.Provider value={{ swapFormData, payment, swap }}>
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