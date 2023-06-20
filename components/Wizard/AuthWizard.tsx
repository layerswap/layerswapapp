import { useRouter } from "next/router";
import { FC, useCallback } from "react";
import { useFormWizardaUpdate } from "../../context/formWizardProvider";
import { TimerProvider } from "../../context/timerContext";
import { AuthStep, SwapCreateStep } from "../../Models/Wizard";
import { TrackEvent } from "../../pages/_document";
import CodeStep from "./Steps/CodeStep";
import EmailStep from "./Steps/EmailStep";
import Wizard from "./Wizard";
import WizardItem from "./WizardItem";


const AuthWizard: FC = () => {
    const { goToStep } = useFormWizardaUpdate()
    const router = useRouter();
    const { redirect } = router.query;

    const CodeOnNext = useCallback(async () => {
        await router.push(redirect?.toString() || '/')
        plausible(TrackEvent.SignedIn)
    }, [redirect]);
    
    const GoBackToEmailStep = useCallback(() => goToStep(AuthStep.Email, "back"), [])
    const GoToCodeStep = useCallback(() => goToStep(AuthStep.Code), [])

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <TimerProvider>
            <Wizard>
                <WizardItem StepName={SwapCreateStep.Email} GoBack={handleGoBack}>
                    <EmailStep OnNext={GoToCodeStep} />
                </WizardItem>
                <WizardItem StepName={SwapCreateStep.Code} GoBack={GoBackToEmailStep}>
                    <CodeStep OnNext={CodeOnNext} />
                </WizardItem>
            </Wizard>
        </TimerProvider>
    )
}

export default AuthWizard;