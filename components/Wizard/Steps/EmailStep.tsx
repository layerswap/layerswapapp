import { FC } from 'react'
import { useAuthDataUpdate } from '../../../context/authContext';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import SendEmail from '../../SendEmail';


const EmailStep: FC = () => {
    const { goToNextStep } = useFormWizardaUpdate()
    const { updateEmail } = useAuthDataUpdate()

    const onSend = (email: string)=> {
        updateEmail(email)
        goToNextStep();
    }

    return (
        <>
            <SendEmail onSend={onSend} />
        </>
    )
}

export default EmailStep;