import { useCallback, useEffect, useState } from "react";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import { useUserExchangeDataUpdate, useUserExchangeState } from "../context/userExchange";
import { apiKeyFlowSteps, Flow, initialWizard, OAuthSteps, StepPath, WizardParts, WizardPartType } from "../context/wizard";
import { UserExchangesResponse } from "../lib/bransferApiClients";
import TokenService from "../lib/TokenService";

export function useWizardNavigation() {
    const [wizard, setWizard] = useState<WizardParts>(initialWizard)

    const { swapFormData, payment } = useSwapDataState()

    const [currentStepPath, setCurrentStep] = useState<StepPath>({ part: WizardPartType.Swap, index: 0 })

    const [moving, setMoving] = useState("right")

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const paymentStatus = payment?.data?.status
    const userExchanges = useUserExchangeState()
    const { getUserExchanges } = useUserExchangeDataUpdate()

    const { createSwap } = useSwapDataUpdate()

    // useEffect(() => {
    //     switch (swapFormData?.exchange?.baseObject?.authorization_flow) {
    //         case Flow.ApiCredentials:
    //             setWizard(old => ({ ...old, Flow: apiKeyFlowSteps }))
    //             break;
    //         case Flow.OAuth:
    //             setWizard(old => ({ ...old, Flow: OAuthSteps }))
    //             break;
    //     }
    // }, [swapFormData])

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

        if (res != currentPart && !wizard[res].steps.length)
            return getPreviousPart(res)

        return res
    }, [])

    const prevStep = useCallback(async () => {
        setMoving("left");
        if (currentStepPath.index == 0)
            setCurrentStep(old => {
                const previousPart = getPreviousPart(old.part)
                return { part: previousPart, index: wizard[previousPart].steps.length - 1 }
            })
        else
            setCurrentStep(old => ({ part: old.part, index: old.index - 1 }))
    }, [currentStepPath, wizard])

    const nextStep = useCallback(async () => {
        setMoving("right")
        try {
            if (currentStepPath.index >= wizard[currentStepPath.part].steps.length - 1) {
                const nextPart = await getNextPart({ currentPart: currentStepPath.part, wizard, userExchanges, swapFormData, getUserExchanges, createSwap })
                setCurrentStep({ part: nextPart, index: 0 })
            }
            else {
                setCurrentStep({ part: currentStepPath.part, index: currentStepPath.index + 1 })
            }
        }
        catch (e) {
            // setError(e.message)
        }
        finally {
            // setLoading(false)
        }
    }, [currentStepPath, wizard, userExchanges, swapFormData, getUserExchanges, createSwap, setLoading, setError])

    return { wizard, nextStep, prevStep, moving, currentStepPath, loading, error }
}

async function getNextPart({ currentPart, wizard, userExchanges, swapFormData, getUserExchanges, createSwap }: {
    currentPart: WizardPartType,
    wizard: WizardParts,
    userExchanges: UserExchangesResponse,
    swapFormData: SwapFormValues,
    getUserExchanges: (token: string) => Promise<UserExchangesResponse>,
    createSwap: () => void
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
            return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges, createSwap })

        if (nextStep === WizardPartType.Flow) {
            if (!authData?.access_token) {
                return WizardPartType.Auth
            }
            const exchanges = userExchanges?.data || await (await getUserExchanges(authData?.access_token))?.data
            if (swapFormData?.exchange?.id && exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)) {
                return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges, createSwap })
            }
        }

        if (nextStep === WizardPartType.Withdrawal) {
            if (!authData?.access_token) {
                return WizardPartType.Auth
            }
            await createSwap();
        }

        if (nextStep != currentPart && !wizard[nextStep].steps.length)
            return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges, createSwap })

        return nextStep
    }
    catch (e) {
        throw e;
    }
}