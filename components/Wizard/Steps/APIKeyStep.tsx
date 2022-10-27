import { FC } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { SwapCreateStep } from '../../../Models/Wizard';
import ConnectApiKeyExchange from '../../connectApiKeyExchange';


const APIKeyStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { exchange } = swapFormData || {}
    const { goToStep } = useFormWizardaUpdate()
    const onConnect = () => goToStep(SwapCreateStep.Confirm)
    if (!exchange)
        return <></>

    return (
        <ConnectApiKeyExchange exchange={swapFormData?.exchange?.baseObject} onSuccess={onConnect} slideOverPlace='inStep' />
    )
}

export default APIKeyStep;