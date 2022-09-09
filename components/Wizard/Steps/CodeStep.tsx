import { FC, useCallback } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { BransferApiClient } from '../../../lib/bransferApiClients';
import KnownIds from '../../../lib/knownIds';
import TokenService from '../../../lib/TokenService';
import { AuthConnectResponse } from '../../../Models/LayerSwapAuth';
import { ExchangeAuthorizationSteps, FormWizardSteps, OfframpExchangeAuthorizationSteps, SwapCreateStep } from '../../../Models/Wizard';
import VerifyEmailCode from '../../VerifyEmailCode';

const CodeStep: FC = () => {
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const { swapFormData } = useSwapDataState()
    const { goToNextStep } = useFormWizardaUpdate()
    const { updateSwapFormData } = useSwapDataUpdate()

    const onSuccessfullVerifyHandler = useCallback(async (res: AuthConnectResponse) => {
        goToNextStep(res)
    }, []);

    return (
        <>
            <VerifyEmailCode onSuccessfullVerify={onSuccessfullVerifyHandler} />
        </>
    )
}

export default CodeStep;