import { FC,  useEffect } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { LoginWizardSteps } from '../../../../Models/Wizard';
import SendEmail from '../../../SendEmail';

type EmailFormValues = {
    email?: string;
    email_confirm_right_wallet?: boolean;
    email_confirm_right_information?: boolean;
}

const EmailStep: FC = () => {
    const { goToStep, setLoading: setWizardLoading } = useFormWizardaUpdate<LoginWizardSteps>()

    useEffect(() => {
        setWizardLoading(false)
    }, [])

    const onSend = () => goToStep("Code")

    return (
        <>
            <SendEmail onSend={onSend} />
        </>
    )
}

export default EmailStep;