import { FC } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { FormWizardSteps } from '../../../Models/Wizard';
import SendEmail from '../../SendEmail';


const EmailStep: FC = () => {
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()

    const onSend = ()=> goToStep("Code")

    return (
        <>
            <SendEmail onSend={onSend} />
        </>
    )
}

export default EmailStep;