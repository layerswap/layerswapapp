import { FC} from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { FormWizardSteps } from '../../../Models/Wizard';
import ConnectApiKeyExchange from '../../connectApiKeyExchange';


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