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
import KnownInternalNames from "../lib/knownIds";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import toast from "react-hot-toast";
import { KnownwErrorCode } from "../Models/ApiError";
import LayerSwapAuthApiClient from "../lib/userAuthApiClient";
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
        onNext: useCallback(async ({ values, swapId }: { values: SwapFormValues, swapId?: string }) => {
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken) {
                try {
                    var apiClient = new LayerSwapAuthApiClient();
                    const res = await apiClient.guestConnectAsync()
                    updateAuthData(res)
                    setUserType(UserType.GuestUser)
                }
                catch (error) {
                    toast.error(error.response?.data?.error || error.message)
                    return;
                }
            }
            const layerswapApiClient = new LayerswapApiClient(router);
            const sourceLayer = values?.from
            //PENDING_SWAPS_CHECK
            // const allPendingSwaps = await layerswapApiClient.GetPendingSwapsAsync()
            // const asset = values.currency?.asset
            // const hasSourcePendingSwaps = allPendingSwaps?.data?.some(s => s.source_network_asset?.toLowerCase() === asset?.toLowerCase() && swapId !== s.id)
            // if (hasSourcePendingSwaps) {
            //     return goToStep(SwapCreateStep.PendingSwaps)
            // }
            // else 
            if (sourceLayer?.isExchange && sourceLayer?.internal_name.toLowerCase() === KnownInternalNames.Exchanges.Coinbase.toLowerCase()) {
                const layerswapApiClient = new LayerSwapApiClient(router)
                try {
                    const res = await layerswapApiClient.GetExchangeAccount(sourceLayer?.internal_name, 1)
                    if (!res?.data) {
                        return goToStep(SwapCreateStep.AuthorizeCoinbaseWithdrawal)
                    }
                }
                catch (e) {
                    if (e?.response?.data?.error?.code === KnownwErrorCode.NOT_FOUND)
                        return goToStep(SwapCreateStep.AuthorizeCoinbaseWithdrawal)
                    else
                        toast(e?.response?.data?.error?.message || e.message)
                }
            }
            return goToStep(SwapCreateStep.Confirm)
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