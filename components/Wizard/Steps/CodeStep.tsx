import { FC, useCallback } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { BransferApiClient } from '../../../lib/bransferApiClients';
import KnownIds from '../../../lib/knownIds';
import TokenService from '../../../lib/TokenService';
import { AuthConnectResponse } from '../../../Models/LayerSwapAuth';
import { ExchangeAuthorizationSteps, FormWizardSteps, OfframpExchangeAuthorizationSteps } from '../../../Models/Wizard';
import VerifyEmailCode from '../../VerifyEmailCode';

const CodeStep: FC = () => {
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const { swapFormData } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const { updateSwapFormData } = useSwapDataUpdate()

    const onSuccessfullVerifyHandler = useCallback(async (res: AuthConnectResponse) => {
        const exchanges = (await getUserExchanges(res.access_token))?.data
        const exchangeIsEnabled = exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)

        if (swapFormData.swapType === "offramp" && swapFormData.exchange.baseObject.id === KnownIds.Exchanges.CoinbaseId) {
            const bransferApiClient = new BransferApiClient()
            try {
                const response = await bransferApiClient.GetExchangeDepositAddress(swapFormData.exchange?.baseObject?.internal_name, swapFormData.currency?.baseObject?.asset?.toUpperCase(), res.access_token)
                if (response.is_success) {
                    updateSwapFormData({ ...swapFormData, destination_address: response.data })
                    goToStep("SwapConfirmation")
                }
                else {
                    throw Error("Could not get exchange deposit address")
                }
            }
            catch (e) {
                await bransferApiClient.DeleteExchange(swapFormData.exchange.baseObject.internal_name, res.access_token)
                goToStep(OfframpExchangeAuthorizationSteps[swapFormData?.exchange?.baseObject?.authorization_flow])
            }
        }
        else if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow === "none" || exchangeIsEnabled)
            goToStep("SwapConfirmation")
        else
            goToStep(ExchangeAuthorizationSteps[swapFormData?.exchange?.baseObject?.authorization_flow])

    }, [swapFormData?.exchange?.baseObject?.id]);

    return (
        <>
            <VerifyEmailCode onSuccessfullVerify={onSuccessfullVerifyHandler} />
        </>
    )
}

export default CodeStep;