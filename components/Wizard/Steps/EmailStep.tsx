import { FC } from 'react'
import { useAuthDataUpdate } from '../../../context/authContext';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { FormWizardSteps } from '../../../Models/Wizard';
import SendEmail from '../../SendEmail';


const EmailStep: FC = () => {
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const { updateEmail } = useAuthDataUpdate()

    const onSend = (email: string)=> {
        updateEmail(email)
        goToStep("Code");
    }

    return (
        <>
            <SendEmail onSend={onSend} />
        </>
    )
}

export default EmailStep;