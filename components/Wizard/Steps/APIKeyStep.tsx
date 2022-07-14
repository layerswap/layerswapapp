import { InformationCircleIcon } from '@heroicons/react/outline';
import { FC, useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useAuthDataUpdate } from '../../../context/auth';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState } from '../../../context/swap';
import { BransferApiClient } from '../../../lib/bransferApiClients';
import ExchangeSettings from '../../../lib/ExchangeSettings';
import { FormWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import ConnectApiKeyExchange from '../../connectApiKeyExchange';
import { DocIframe } from '../../docInIframe';
import SlideOver, { SildeOverRef } from '../../SlideOver';

const APIKeyStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const onConnect = () => goToStep("SwapConfirmation")
    return (
        <>
            <ConnectApiKeyExchange exchange={swapFormData?.exchange?.baseObject} onSuccess={onConnect} />
        </>
    )
}

export default APIKeyStep;