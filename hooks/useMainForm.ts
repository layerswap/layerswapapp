import { FC } from "react";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import EmailStep from "../components/SendEmail";
import MainStep from "../components/Wizard/Steps/MainStep";
import { useSwapDataState, useSwapDataUpdate } from "../context/swap";
import { useUserExchangeDataUpdate } from "../context/userExchange";
import { BransferApiClient } from "../lib/bransferApiClients";
import KnownIds from "../lib/knownIds";
import TokenService from "../lib/TokenService";
import { AuthConnectResponse } from "../Models/LayerSwapAuth";
import { Step, _WizardStep } from "../Models/Wizard";



export const ExchangeAuthorizationSteps: { [key: string]: Step } = {
    "api_credentials": Step.ApiKey,
    "o_auth2": Step.OAuth
}
const immutableXApiAddress = 'https://api.x.immutable.com/v1';

type WizardData = {
    steps: _WizardStep<any>[],
    initialStep: Step
}

const useMainForm = (): WizardData => {
    const { updateSwapFormData } = useSwapDataUpdate()
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const { swapFormData } = useSwapDataState()

    const MainForm: _WizardStep<SwapFormValues> = {
        Content: MainStep,
        onNext: async (values) => {
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken)
                return Step.Email;

            if (values.swapType === "offramp" && values.exchange.baseObject.id === KnownIds.Exchanges.CoinbaseId) {
                const bransferApiClient = new BransferApiClient()
                try {
                    const response = await bransferApiClient.GetExchangeDepositAddress(values.exchange?.baseObject?.internal_name, values.currency?.baseObject?.asset?.toUpperCase(), accessToken)
                    if (response.is_success) {
                        updateSwapFormData({ ...values, destination_address: response.data })
                        return Step.Confirm;
                    }
                    else {
                        throw Error("Could not get exchange deposit address")
                    }
                }
                catch (e) {
                    const exchanges = (await getUserExchanges(accessToken))?.data
                    if (exchanges.some(e => e.exchange === values.exchange.baseObject.internal_name))
                        await bransferApiClient.DeleteExchange(values.exchange.baseObject.internal_name, accessToken)
                    return Step.OffRampOAuth
                }
            }
            else {
                const exchanges = (await getUserExchanges(accessToken))?.data
                const exchangeIsEnabled = exchanges?.some(e => e.exchange === values?.exchange?.id && e.is_enabled)
                if (values?.exchange?.baseObject?.authorization_flow === "none" || !values?.exchange?.baseObject?.authorization_flow || exchangeIsEnabled)
                    return Step.Confirm
                else
                    return ExchangeAuthorizationSteps[values?.exchange?.baseObject?.authorization_flow]
            }
        },
        Step: Step.MainForm
    }

    // const FormWizard: FormWizardSteps = {
    //   "SwapForm": { title: "Swap", content: MainStep, navigationDisabled: true, positionPercent: 0 },
    //   "Email": { title: "Email confirmation", content: EmailStep, dismissOnBack: true, positionPercent: 30 },
    //   "Code": { title: "Code", content: CodeStep, dismissOnBack: true, navigationDisabled: true, positionPercent: 35 },
    //   "ExchangeOAuth": { title: "OAuth flow", content: AccountConnectStep, dismissOnBack: true, positionPercent: 45 },
    //   "OffRampExchangeOAuth": { title: "OAuth flow", content: OfframpAccountConnectStep, dismissOnBack: true, positionPercent: 45 },
    //   "ExchangeApiCredentials": { title: "Please provide Read-only API keys", content: APIKeyStep, dismissOnBack: true, positionPercent: 50 },
    //   "SwapConfirmation": { title: "Swap confirmation", content: SwapConfirmationStep, positionPercent: 60 },
    // }

    const Email: _WizardStep<any> = {
        Content: EmailStep,
        onNext: async (res: AuthConnectResponse) => {
            const exchanges = (await getUserExchanges(res.access_token))?.data
            const exchangeIsEnabled = exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)

            if (swapFormData.swapType === "offramp" && swapFormData.exchange.baseObject.id === KnownIds.Exchanges.CoinbaseId) {
                const bransferApiClient = new BransferApiClient()
                try {
                    const response = await bransferApiClient.GetExchangeDepositAddress(swapFormData.exchange?.baseObject?.internal_name, swapFormData.currency?.baseObject?.asset?.toUpperCase(), res.access_token)
                    if (response.is_success) {
                        updateSwapFormData({ ...swapFormData, destination_address: response.data })
                        return Step.Confirm
                    }
                    else {
                        throw Error("Could not get exchange deposit address")
                    }
                }
                catch (e) {
                    if (exchanges.some(e => e.exchange === swapFormData.exchange.baseObject.internal_name))
                        await bransferApiClient.DeleteExchange(swapFormData.exchange.baseObject.internal_name, res.access_token)
                    return Step.OffRampOAuth
                }
            }
            else if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow === "none" || exchangeIsEnabled)
                return Step.Confirm
            else
                return ExchangeAuthorizationSteps[swapFormData?.exchange?.baseObject?.authorization_flow]
        },
        Step: Step.Email
    }

    return { steps: [MainForm, Email], initialStep: Step.MainForm }
};

export default useMainForm;