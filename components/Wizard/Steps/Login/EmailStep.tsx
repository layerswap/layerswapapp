import { FC, useEffect } from 'react'
import { useAuthDataUpdate } from '../../../../context/auth';
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { LoginWizardSteps } from '../../../../Models/Wizard';
import SendEmail from '../../../SendEmail';

const EmailStep: FC = () => {
    const { goToStep, setLoading: setWizardLoading } = useFormWizardaUpdate<LoginWizardSteps>()
    const { updateEmail } = useAuthDataUpdate()

    useEffect(() => {
        setWizardLoading(false)
    }, [])


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