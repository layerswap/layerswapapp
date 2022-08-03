import { FC,  useEffect } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { LoginWizardSteps } from '../../../../Models/Wizard';
import SendEmail from '../../../SendEmail';

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