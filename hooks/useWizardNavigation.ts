import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import { useUserExchangeDataUpdate, useUserExchangeState } from "../context/userExchange";
import { apiKeyFlowSteps, Flow, initialWizard, OAuthSteps, StepPath, WizardParts, WizardPartType } from "../context/wizard";
import { BransferApiClient, UserExchangesResponse } from "../lib/bransferApiClients";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import TokenService from "../lib/TokenService";
import { SwapStatus } from "../Models/SwapStatus";
import { useInterval } from "./useInyterval";

export type WizardState = {
    moving: string,
    loading: boolean,
    error: string,
    wizard: WizardParts,
    currentStepPath: StepPath
}
const _maxRevalidateCount = 18;

export function useWizardNavigation() {

    const [data, setData] = useState<WizardState>({
        currentStepPath: { part: WizardPartType.Swap, index: 0 },
        moving: "right",
        loading: false,
        error: "",
        wizard: initialWizard
    })
    const [revalidateCount, setRevialidateCount] = useState(0)

    const revalidateTimeoutId = useRef<NodeJS.Timeout>();

    const goToStep = (stepPath: StepPath) => {
        setData(old => ({ ...old, currentStepPath: stepPath }))
    }

    const { swapFormData } = useSwapDataState()

    const { getSwap } = useSwapDataUpdate()


    const userExchanges = useUserExchangeState()
    const { getUserExchanges } = useUserExchangeDataUpdate()

    const router = useRouter()
    const { swapId } = router?.query || {}

    useInterval(() => {
        if (swapId)
            (async () => {
                const authData = TokenService.getAuthData();
                if (!authData){
                    // setData(old => ({ ...old, currentStepPath: { part: WizardPartType.Auth, index: 0 } }))
                    return;
                }                   
                const layerswapApiClient = new LayerSwapApiClient()
                const bransferApiClient = new BransferApiClient()
                const swapDetails = await layerswapApiClient.getSwapDetails(swapId?.toString(), authData?.access_token)
                const payment = await bransferApiClient.GetPayment(swapDetails.external_payment_id, authData?.access_token)
                const swapStatus = swapDetails?.status;
                const paymentStatus = payment?.data?.status
                if (swapStatus == SwapStatus.Completed)
                    setData(old => ({ ...old, currentStepPath: { part: WizardPartType.PaymentStatus, index: 2 } }))
                else if (swapStatus == SwapStatus.Failed || paymentStatus == 'closed')
                    setData(old => ({ ...old, currentStepPath: { part: WizardPartType.PaymentStatus, index: 3 } }))
                else if (swapStatus == SwapStatus.Created) {
                    if (paymentStatus == 'created')
                        setData(old => ({ ...old, currentStepPath: { part: WizardPartType.Withdrawal, index: 1 } }))
                    else
                        setData(old => ({ ...old, currentStepPath: { part: WizardPartType.PaymentStatus, index: 0 } }))
                }
            })()
    }, [swapId], 2000)

    useEffect(() => {
        switch (swapFormData?.exchange?.baseObject?.authorization_flow) {
            case Flow.ApiCredentials:
                setData(old => ({ ...old, wizard: { ...initialWizard, Flow: apiKeyFlowSteps } }))
                break;
            case Flow.OAuth:
                setData(old => ({ ...old, wizard: { ...initialWizard, Flow: OAuthSteps } }))
                break;
        }
    }, [swapFormData])

    const getPreviousPart = useCallback((currentPart: WizardPartType) => {
        let res: WizardPartType = currentPart;

        switch (currentPart) {
            case WizardPartType.PaymentStatus:
                res = WizardPartType.Withdrawal
            case WizardPartType.Withdrawal:
                res = WizardPartType.Flow
            case WizardPartType.Flow:
                if (TokenService?.getAuthData()?.access_token)
                    res = WizardPartType.Swap
                else
                    res = WizardPartType.Auth
                break;
            case WizardPartType.Auth:
                res = WizardPartType.Swap
                break;
        }

        if (res != currentPart && !data.wizard[res].steps.length)
            return getPreviousPart(res)

        return res
    }, [data])

    const prevStep = useCallback(async () => {
        setData(old => ({ ...old, loading: true, error: "", moving: "left" }))

        const previousStepPath = { ...data.currentStepPath }
        if (data.currentStepPath.index == 0) {
            previousStepPath.part = getPreviousPart(data.currentStepPath.part)
            previousStepPath.index = 0
        }
        else {
            previousStepPath.index = data.currentStepPath.index - 1
        }
        setData(old => ({ ...old, currentStepPath: previousStepPath }))
    }, [data])

    const nextStep = useCallback(async () => {
        setData(old => ({ ...old, loading: true, error: "", moving: "right" }))
        const currentStepPath = data.currentStepPath
        const nextStepPath = { ...currentStepPath }
        try {
            if (currentStepPath.index >= data.wizard[currentStepPath.part].steps.length - 1) {
                const nextPart = await getNextPart({ currentPart: currentStepPath.part, wizard: data.wizard, userExchanges, swapFormData, getUserExchanges })
                nextStepPath.part = nextPart;
                nextStepPath.index = 0;
            }
            else {
                nextStepPath.part = currentStepPath.part;
                nextStepPath.index = currentStepPath.index + 1;
            }
            setData(old => ({ ...old, loading: false, error: "", currentStepPath: nextStepPath }))
        }
        catch (e) {
            setData(old => ({ ...old, loading: false, error: e.message }))
        }
    }, [data, userExchanges, swapFormData, getUserExchanges])

    return { nextStep, prevStep, data, goToStep }
}

async function getNextPart({ currentPart, wizard, userExchanges, swapFormData, getUserExchanges }: {
    currentPart: WizardPartType,
    wizard: WizardParts,
    userExchanges: UserExchangesResponse,
    swapFormData: SwapFormValues,
    getUserExchanges: (token: string) => Promise<UserExchangesResponse>,
}) {
    try {
        const authData = TokenService?.getAuthData()
        let nextStep: WizardPartType = currentPart;
        switch (currentPart) {
            case WizardPartType.Swap:
                nextStep = WizardPartType.Auth
                break;
            case WizardPartType.Auth:
                nextStep = WizardPartType.Flow
                break;
            case WizardPartType.Flow:
                nextStep = WizardPartType.Withdrawal
                break;
            case WizardPartType.Withdrawal:
                nextStep = WizardPartType.PaymentStatus
                break;
        }

        if (nextStep === WizardPartType.Auth && authData?.access_token)
            return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges })

        if (nextStep === WizardPartType.Flow) {

            if (!authData?.access_token) {
                return WizardPartType.Auth
            }
            const exchanges = userExchanges?.data || await (await getUserExchanges(authData?.access_token))?.data
            console.log(exchanges)
            console.log(swapFormData?.exchange?.id && exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled))
            if (swapFormData?.exchange?.id && exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)) {
                return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges })
            }
        }
        if (nextStep === WizardPartType.Withdrawal) {
            if (!authData?.access_token) {
                return WizardPartType.Auth
            }
        }
        if (nextStep != currentPart && !wizard[nextStep].steps.length)
            return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges })

        return nextStep
    }
    catch (e) {
        throw e;
    }
}