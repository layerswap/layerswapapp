import React, { useCallback, useEffect } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { BransferApiClient, Payment } from '../lib/bransferApiClients';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import { useAuthDataUpdate, useAuthState } from './auth';
import Router, { useRouter } from 'next/router'
import TokenService from '../lib/TokenService';
import { useInterval } from '../hooks/useInyterval';

const SwapDataStateContext = React.createContext<SwapData>(null);
const SwapDataUpdateContext = React.createContext<UpdateInterface>(null);

type UpdateInterface = {
    updateSwapFormData: (data: SwapFormValues) => void,
    createSwap: () => void,
    processPayment: (id: string) => void,
    getPayment: (id: string) => Promise<Payment>
}

type SwapData = {
    swapFormData: SwapFormValues,
    payment: Payment
}

export function SwapDataProvider({ children }) {
    const [swapFormData, setSwapData] = React.useState<SwapFormValues>();
    const [payment, setPayment] = React.useState<Payment>();

    const { getAuthData } = useAuthDataUpdate();

    const router = useRouter()
    const { paymentId } = router?.query || { paymentId: payment?.data?.id }

    useEffect(() => {
        const authData = TokenService.getAuthData();
        if (authData && paymentId && !payment)
            (async () => {
                const bransferApiClient = new BransferApiClient()
                const payment = await bransferApiClient.GetPayment(paymentId?.toString(), authData?.access_token)
                setPayment(payment)
            })();
    }, [paymentId])

    useInterval(async () => {
        const { access_token } = TokenService.getAuthData() || {}
        if (paymentId && access_token) {
            const bransferApiClient = new BransferApiClient()
            const payment = await bransferApiClient.GetPayment(paymentId?.toString(), access_token)
            setPayment(payment)
        }

    }, [paymentId], 5000)

    const updateFns = {
        updateSwapFormData: (data: SwapFormValues) => {
            setSwapData(data)
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

                const swapDetails = await layerswapApiClient.getSwapDetails(swap.value?.swap_id, authData?.access_token)

                const bransferApiClient = new BransferApiClient()
                const payment = await bransferApiClient.GetPayment(swapDetails.external_payment_id, authData?.access_token)
                await setPayment(payment)
                Router.push({ query: { paymentId: payment.data.id } })
                return payment;
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
        processPayment: useCallback(async (id) => {
            const authData = getAuthData()
            const bransferApiClient = new BransferApiClient()
            const prcoessPaymentReponse = await bransferApiClient.ProcessPayment(id, authData?.access_token)
            if (!prcoessPaymentReponse.is_success)
                throw new Error(prcoessPaymentReponse.errors)
            const payment = await bransferApiClient.GetPayment(id, authData?.access_token)
            await setPayment(payment)
        }, [getAuthData]),
    };

    return (
        <SwapDataStateContext.Provider value={{ swapFormData, payment }}>
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