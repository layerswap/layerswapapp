import { useCallback } from "react";
import CodeStep from "../components/Wizard/Steps/CodeStep";
import EmailStep from "../components/Wizard/Steps/EmailStep";
import MainStep from "../components/Wizard/Steps/MainStep/index";
import SwapConfirmationStep from "../components/Wizard/Steps/ConfirmStep/OnRampSwapConfirmationStep";
import { useFormWizardaUpdate } from "../context/formWizardProvider";
import { useSwapDataState } from "../context/swap";
import TokenService from "../lib/TokenService";
import { AuthConnectResponse } from "../Models/LayerSwapAuth";
import { SwapCreateStep, WizardStep } from "../Models/Wizard";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { useRouter } from "next/router";
import LayerswapApiClient, { SwapType } from '../lib/layerSwapApiClient';
import AccountConnectStep from "../components/Wizard/Steps/CoinbaseAccountConnectStep";
import { useUserExchangeDataUpdate } from "../context/userExchange";

const useCreateSwap = () => {
    const { goToStep } = useFormWizardaUpdate()
    const { swapFormData } = useSwapDataState()
    const router = useRouter();

    const MainForm: WizardStep<SwapCreateStep> = {
        Content: MainStep,
        Name: SwapCreateStep.MainForm,
        positionPercent: 0,
        onNext: useCallback(async (values: SwapFormValues) => {
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken)
                return goToStep(SwapCreateStep.Email);
            else {
                const layerswapApiClient = new LayerswapApiClient(router);
                const allPendingSwaps = await layerswapApiClient.GetPendingSwapsAsync()
                const hasSourcePendingSwaps = allPendingSwaps?.data?.some(s => s.source_network_asset?.toLocaleLowerCase() === values.currency?.baseObject?.asset?.toLowerCase())
                if (hasSourcePendingSwaps) {
                    return goToStep(SwapCreateStep.PendingSwaps)
                }

                if(values.exchange?.baseObject?.authorization_flow == "o_auth2"){
                    try{
                        const res = await layerswapApiClient.GetExchangeAccount(values.exchange?.baseObject?.internal_name)
                    }
                    catch(e){
                        console.log(e)
                    }
                }

                return goToStep(SwapCreateStep.Confirm)
            }
        }, []),
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
            MainForm.onNext(swapFormData)
        }, [swapFormData]),
        positionPercent: 35,
        onBack: useCallback(() => goToStep(SwapCreateStep.Email, "back"), []),
    }
    const OAuth: WizardStep<SwapCreateStep> = {
        Content: AccountConnectStep,
        Name: SwapCreateStep.OAuth,
        positionPercent: 60,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), []),
    }
    const Confirm: WizardStep<SwapCreateStep> = {
        Content: SwapConfirmationStep,
        Name: SwapCreateStep.Confirm,
        positionPercent: 60,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), []),
    }

    return { MainForm, Email, Code, Confirm, OAuth }
}

export default useCreateSwap;