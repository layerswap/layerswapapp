import { useCallback } from "react";
import APIKeyStep from "../components/Wizard/Steps/APIKeyStep";
import CodeStep from "../components/Wizard/Steps/CodeStep";
import EmailStep from "../components/Wizard/Steps/EmailStep";
import MainStep from "../components/Wizard/Steps/MainStep/index";
import OfframpAccountConnectStep from "../components/Wizard/Steps/OfframpAccountConnectStep";
import SwapConfirmationStep from "../components/Wizard/Steps/ConfirmStep/OnRampSwapConfirmationStep";
import { useFormWizardaUpdate } from "../context/formWizardProvider";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import { useUserExchangeDataUpdate } from "../context/userExchange";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import TokenService from "../lib/TokenService";
import { AuthConnectResponse } from "../Models/LayerSwapAuth";
import { ExchangeAuthorizationSteps, OfframpExchangeAuthorizationSteps, SwapCreateStep, WizardStep } from "../Models/Wizard";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { useRouter } from "next/router";
import LayerswapApiClient, { SwapType } from '../lib/layerSwapApiClient';


const useCreateSwap = () => {
    const { goToStep } = useFormWizardaUpdate()
    const { updateSwapFormData } = useSwapDataUpdate()
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const { swapFormData } = useSwapDataState()
    const router = useRouter();
    const { swapType, exchange, currency } = swapFormData || {}


    const MainForm: WizardStep<SwapCreateStep> = {
        Content: MainStep,
        Name: SwapCreateStep.MainForm,
        positionPercent: 0,
        onNext: async (values: SwapFormValues) => {
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken)
                return goToStep(SwapCreateStep.Email);
            else {
                return goToStep(SwapCreateStep.Confirm)
            }
        },
    }

    const Email: WizardStep<SwapCreateStep> = {
        Content: EmailStep,
        Name: SwapCreateStep.Email,
        positionPercent: 30,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), []),
        onNext: useCallback(async () => goToStep(SwapCreateStep.Code), []),
    }

    const Code: WizardStep<SwapCreateStep> = {
        Content: CodeStep,
        Name: SwapCreateStep.Code,
        onNext: useCallback(async (res: AuthConnectResponse) => {
            return goToStep(SwapCreateStep.Confirm)
        }, [swapFormData]),
        positionPercent: 35,
        onBack: useCallback(() => goToStep(SwapCreateStep.Email, "back"), []),
    }
    const OffRampOAuth: WizardStep<SwapCreateStep> = {
        Content: OfframpAccountConnectStep,
        Name: SwapCreateStep.OffRampOAuth,
        positionPercent: 45,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), []),
    }
    const Confirm: WizardStep<SwapCreateStep> = {
        Content: SwapConfirmationStep,
        Name: SwapCreateStep.Confirm,
        positionPercent: 60,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), []),
    }

    return { MainForm, Email, Code, OffRampOAuth, Confirm }
}

export default useCreateSwap;