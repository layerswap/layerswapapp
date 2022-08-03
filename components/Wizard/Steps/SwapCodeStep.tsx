import { FC } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { SwapWizardSteps } from '../../../Models/Wizard';
import VerifyEmailCode from '../../VerifyEmailCode';

const  SwapCodeStep: FC = () => {
    const { goToStep } = useFormWizardaUpdate<SwapWizardSteps>()

    const onSuccessfullVerifyHandler = () => new Promise<void>(()=> {
        return goToStep("Overview")
    })
    
    return (
        <>
            <VerifyEmailCode onSuccessfullVerify={onSuccessfullVerifyHandler} />
        </>
    )
}

export default SwapCodeStep;