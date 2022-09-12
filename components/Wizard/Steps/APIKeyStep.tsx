import { FC } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { SwapCreateStep } from '../../../Models/Wizard';
import ConnectApiKeyExchange from '../../connectApiKeyExchange';


const APIKeyStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate()
    const onConnect = () => goToStep(SwapCreateStep.Confirm)
    
    return (
        <>
            <ConnectApiKeyExchange exchange={swapFormData?.exchange?.baseObject} onSuccess={onConnect} slideOverClassNames="-mt-11 md:-mt-8" />
        </>
    )
}

export default APIKeyStep;