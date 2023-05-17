import { useCallback } from "react";
import CodeStep from "../components/Wizard/Steps/CodeStep";
import EmailStep from "../components/Wizard/Steps/EmailStep";
import MainStep from "../components/Wizard/Steps/MainStep/index";
import SwapConfirmationStep from "../components/Wizard/Steps/ConfirmStep/OnRampSwapConfirmationStep";
import { useFormWizardaUpdate } from "../context/formWizardProvider";
import { useSwapDataState } from "../context/swap";
import { AuthConnectResponse } from "../Models/LayerSwapAuth";
import { SwapCreateStep, WizardStep } from "../Models/Wizard";
import { useRouter } from "next/router";
import AccountConnectStep from "../components/Wizard/Steps/CoinbaseAccountConnectStep";
import { useAuthDataUpdate, UserType } from "../context/authContext";

const useCreateSwap = () => {
    const { goToStep } = useFormWizardaUpdate()
    const { swapFormData, swap } = useSwapDataState()
    const router = useRouter();
    const { updateAuthData, setUserType } = useAuthDataUpdate()

    const MainForm: WizardStep<SwapCreateStep> = {
        Content: MainStep,
        Name: SwapCreateStep.MainForm,
        positionPercent: 0,
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
            await MainForm.onNext(swapFormData)
        }, [swapFormData]),
        positionPercent: 35,
        onBack: useCallback(() => goToStep(SwapCreateStep.Email, "back"), []),
    }
    const CoinbaseAuthorize: WizardStep<SwapCreateStep> = {
        Content: AccountConnectStep,
        Name: SwapCreateStep.AuthorizeCoinbaseWithdrawal,
        positionPercent: 60,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), []),
        onNext: useCallback(async () => goToStep(SwapCreateStep.Confirm), []),
    }
    const Confirm: WizardStep<SwapCreateStep> = {
        Content: SwapConfirmationStep,
        Name: SwapCreateStep.Confirm,
        positionPercent: 60,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), []),
    }

    return { MainForm, Email, Code, Confirm, CoinbaseAuthorize }
}

export default useCreateSwap;