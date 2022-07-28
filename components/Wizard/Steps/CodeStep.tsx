import { FC, useCallback } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { AuthConnectResponse } from '../../../Models/LayerSwapAuth';
import { ExchangeAuthorizationSteps, FormWizardSteps } from '../../../Models/Wizard';
import VerifyEmailCode from '../../VerifyEmailCode';

const CodeStep: FC = () => {
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const { swapFormData } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()

    const onSuccessfullVerifyHandler = useCallback(async (res: AuthConnectResponse) => {
        const exchanges = (await getUserExchanges(res.access_token))?.data
        const exchangeIsEnabled = exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)

        if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow === "none" || exchangeIsEnabled)
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