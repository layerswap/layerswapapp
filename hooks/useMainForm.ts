import { FC } from "react";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import MainStep from "../components/Wizard/Steps/MainStep";
import { useSwapDataUpdate } from "../context/swap";
import { useUserExchangeDataUpdate } from "../context/userExchange";
import { BransferApiClient } from "../lib/bransferApiClients";
import KnownIds from "../lib/knownIds";
import TokenService from "../lib/TokenService";
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

    return { steps: [MainForm], initialStep: Step.MainForm }
};

export default useMainForm;