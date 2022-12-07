import { useCallback } from "react";
import AccountConnectStep from "../components/Wizard/Steps/CoinbaseAccountConnectStep";
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

    const handleOfframp = useCallback(async (formData: SwapFormValues, access_token: string) => {
        const exchanges = await getUserExchanges()
        const { exchange: selected_exchange, currency } = formData
        const selected_exchange_id = selected_exchange.baseObject.id
        const selected_exchange_internal_name = selected_exchange?.baseObject?.internal_name
        const selected_exchange_auth_flow = selected_exchange?.baseObject?.authorization_flow

        const exchangeConncted = exchanges.some(e => e.exchange_id === selected_exchange_id)
        if (!exchangeConncted)
            return goToStep(OfframpExchangeAuthorizationSteps[selected_exchange_auth_flow])

        const layerswapApiClient = new LayerSwapApiClient(router)
        const asset = currency?.baseObject?.asset
        try {
            const response = await layerswapApiClient.GetExchangeDepositAddress(selected_exchange_internal_name, asset.toUpperCase())
            if (!response.error) {
                const { data } = response
                updateSwapFormData({ ...formData, destination_address: data })
                return goToStep(SwapCreateStep.Confirm)
            }
            else {
                throw Error("Could not get exchange deposit address")
            }
        }
        catch (e) {
            await layerswapApiClient.DeleteExchange(selected_exchange_internal_name)
            return goToStep(OfframpExchangeAuthorizationSteps[selected_exchange_auth_flow])
        }
    }, [])

    const MainForm: WizardStep<SwapCreateStep> = {
        Content: MainStep,
        Name: SwapCreateStep.MainForm,
        positionPercent: 0,
        onNext: async (values: SwapFormValues) => {
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken)
                return goToStep(SwapCreateStep.Email);

            if (values.swapType === SwapType.OffRamp) {
                handleOfframp(values, accessToken)
            }
            else {
                const exchanges = await getUserExchanges()
                const exchangeIsEnabled = exchanges?.some(e => e.exchange_id === values?.exchange?.baseObject.id)
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
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), []),
        onNext: useCallback(async () => goToStep(SwapCreateStep.Code), []),
    }

    const Code: WizardStep<SwapCreateStep> = {
        Content: CodeStep,
        Name: SwapCreateStep.Code,
        onNext: useCallback(async (res: AuthConnectResponse) => {
            const exchanges = await getUserExchanges()
            const exchangeIsEnabled = exchanges?.some(e => e.exchange_id === swapFormData?.exchange?.baseObject.id)

            if (swapFormData.swapType === SwapType.OffRamp) {
                handleOfframp(swapFormData, res.access_token)
            }
            else if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow === "none" || exchangeIsEnabled)
                return goToStep(SwapCreateStep.Confirm)
            else
                return goToStep(ExchangeAuthorizationSteps[swapFormData?.exchange?.baseObject?.authorization_flow])
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
    const ApiKey: WizardStep<SwapCreateStep> = {
        Content: APIKeyStep,
        Name: SwapCreateStep.ApiKey,
        positionPercent: 45,
        onBack: useCallback(() => goToStep(SwapCreateStep.MainForm, "back"), [swapType, exchange, currency]),
        onNext: useCallback(async () => {
            if (swapType === SwapType.OffRamp) {
                const layerswapApiClient = new LayerswapApiClient(router);
                const response = await layerswapApiClient.GetExchangeDepositAddress(exchange?.baseObject?.internal_name, currency?.baseObject?.asset.toUpperCase())
                if (!response.error) {
                    const { data } = response
                    updateSwapFormData({ ...swapFormData, destination_address: data })
                }
                else {
                    throw Error("Could not get exchange deposit address")
                }
            }
            goToStep(SwapCreateStep.Confirm)
        }, [currency, exchange, swapType])
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

    return { MainForm, Email, Code, OAuth, ApiKey, OffRampOAuth, Confirm }
}

export default useCreateSwap;