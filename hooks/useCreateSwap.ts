import { useCallback } from "react";
import AccountConnectStep from "../components/Wizard/Steps/AccountConnectStep";
import APIKeyStep from "../components/Wizard/Steps/APIKeyStep";
import CodeStep from "../components/Wizard/Steps/CodeStep";
import EmailStep from "../components/Wizard/Steps/EmailStep";
import MainStep from "../components/Wizard/Steps/MainStep";
import OfframpAccountConnectStep from "../components/Wizard/Steps/OfframpAccountConnectStep";
import SwapConfirmationStep from "../components/Wizard/Steps/SwapConfirmationStep";
import { useFormWizardaUpdate } from "../context/formWizardProvider";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import { useUserExchangeDataUpdate } from "../context/userExchange";
import { BransferApiClient } from "../lib/bransferApiClients";
import KnownIds from "../lib/knownIds";
import TokenService from "../lib/TokenService";
import { AuthConnectResponse } from "../Models/LayerSwapAuth";
import { ExchangeAuthorizationSteps, OfframpExchangeAuthorizationSteps, SwapCreateStep, WizardStep } from "../Models/Wizard";


const immutableXApiAddress = 'https://api.x.immutable.com/v1';

const useCreateSwap = () => {
    const { goToStep } = useFormWizardaUpdate()
    const { updateSwapFormData } = useSwapDataUpdate()
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const { swapFormData } = useSwapDataState()


    const MainForm: WizardStep<SwapCreateStep> = {
        Content: MainStep,
        Name: SwapCreateStep.MainForm,
        positionPercent: 0,
        onNext: async (values) => {
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken)
                return goToStep(SwapCreateStep.Email);

            if (values.swapType === "offramp" && values.exchange.baseObject.id === KnownIds.Exchanges.CoinbaseId) {
                const bransferApiClient = new BransferApiClient()
                try {
                    const response = await bransferApiClient.GetExchangeDepositAddress(values.exchange?.baseObject?.internal_name, values.currency?.baseObject?.asset?.toUpperCase(), accessToken)
                    if (response.is_success) {
                        updateSwapFormData({ ...values, destination_address: response.data })
                        return goToStep(SwapCreateStep.Confirm);
                    }
                    else {
                        throw Error("Could not get exchange deposit address")
                    }
                }
                catch (e) {
                    const exchanges = (await getUserExchanges(accessToken))?.data
                    if (exchanges.some(e => e.exchange === values.exchange.baseObject.internal_name))
                        await bransferApiClient.DeleteExchange(values.exchange.baseObject.internal_name, accessToken)
                    return goToStep(SwapCreateStep.OffRampOAuth)
                }
            }
            else {
                const exchanges = (await getUserExchanges(accessToken))?.data
                const exchangeIsEnabled = exchanges?.some(e => e.exchange === values?.exchange?.id && e.is_enabled)
                if (values?.exchange?.baseObject?.authorization_flow === "none" || !values?.exchange?.baseObject?.authorization_flow || exchangeIsEnabled)
                    return goToStep(SwapCreateStep.Confirm)
                else
                    return goToStep(ExchangeAuthorizationSteps[values?.exchange?.baseObject?.authorization_flow])
            }
        },
    }

    const Email: WizardStep<SwapCreateStep> = {
        Content: EmailStep,
        Name: SwapCreateStep.Email,
        positionPercent: 30,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm), []),
        onNext: useCallback(() => goToStep(SwapCreateStep.Code), []),
    }

    const Code: WizardStep<SwapCreateStep> = {
        Content: CodeStep,
        Name: SwapCreateStep.Code,
        onNext: useCallback(async (res: AuthConnectResponse) => {
            const exchanges = (await getUserExchanges(res.access_token))?.data
            const exchangeIsEnabled = exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)

            if (swapFormData.swapType === "offramp" && swapFormData.exchange.baseObject.id === KnownIds.Exchanges.CoinbaseId) {
                const bransferApiClient = new BransferApiClient()
                try {
                    const response = await bransferApiClient.GetExchangeDepositAddress(swapFormData.exchange?.baseObject?.internal_name, swapFormData.currency?.baseObject?.asset?.toUpperCase(), res.access_token)
                    if (response.is_success) {
                        updateSwapFormData({ ...swapFormData, destination_address: response.data })
                        return goToStep(SwapCreateStep.Confirm)
                    }
                    else {
                        throw Error("Could not get exchange deposit address")
                    }
                }
                catch (e) {
                    if (exchanges.some(e => e.exchange === swapFormData.exchange.baseObject.internal_name))
                        await bransferApiClient.DeleteExchange(swapFormData.exchange.baseObject.internal_name, res.access_token)
                    return goToStep(OfframpExchangeAuthorizationSteps[swapFormData?.exchange?.baseObject?.authorization_flow])
                }
            }
            else if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow === "none" || exchangeIsEnabled)
                return goToStep(SwapCreateStep.Confirm)
            else
                return goToStep(ExchangeAuthorizationSteps[swapFormData?.exchange?.baseObject?.authorization_flow])
        }, [swapFormData]),
        positionPercent: 35,
        onBack: useCallback(() => goToStep(SwapCreateStep.Email), []),
    }
    const OAuth: WizardStep<SwapCreateStep> = {
        Content: AccountConnectStep,
        Name: SwapCreateStep.OAuth,
        positionPercent: 45,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm), []),
    }
    const ApiKey: WizardStep<SwapCreateStep> = {
        Content: APIKeyStep,
        Name: SwapCreateStep.ApiKey,
        positionPercent: 45,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm), []),
    }
    const OffRampOAuth: WizardStep<SwapCreateStep> = {
        Content: OfframpAccountConnectStep,
        Name: SwapCreateStep.OffRampOAuth,
        positionPercent: 45,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm), []),
    }
    const Confirm: WizardStep<SwapCreateStep> = {
        Content: SwapConfirmationStep,
        Name: SwapCreateStep.Confirm,
        positionPercent: 60,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm), []),
    }

    return { MainForm, Email, Code, OAuth, ApiKey, OffRampOAuth, Confirm }
}

export default useCreateSwap;