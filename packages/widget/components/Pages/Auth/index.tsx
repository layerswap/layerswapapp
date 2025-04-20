import { FC, useCallback } from "react";
import { FormWizardProvider, useFormWizardaUpdate } from "../../../context/formWizardProvider";
import { TimerProvider } from "../../../context/timerContext";
import { AuthStep, SwapCreateStep } from "../../../Models/Wizard";
// import { TrackEvent } from "../../../pages/_document";
import CodeStep from "./Steps/CodeStep";
import EmailStep from "./Steps/EmailStep";
import Wizard from "../../Wizard/Wizard";
import WizardItem from "../../Wizard/WizardItem";
import { useAppRouter } from "../../../context/AppRouter/RouterProvider";
import { SwapDataProvider } from "../../../context/swap";
import AppWrapper, { AppPageProps } from "../../AppWrapper";

const Comp: FC = () => {
    const { goToStep } = useFormWizardaUpdate()
    const router = useAppRouter();

    const CodeOnNext = useCallback(async () => {
        await router.push({
            pathname: "/",
            query: router.query
        })
        // plausible(TrackEvent.SignedIn)
    }, []);

    const GoBackToEmailStep = useCallback(() => goToStep(AuthStep.Email, "back"), [])
    const GoToCodeStep = useCallback(() => goToStep(AuthStep.Code), [])

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <TimerProvider>
            <Wizard wizardId="auth">
                <WizardItem StepName={SwapCreateStep.Email} GoBack={handleGoBack} className="pb-6">
                    <EmailStep OnNext={GoToCodeStep} />
                </WizardItem>
                <WizardItem StepName={SwapCreateStep.Code} GoBack={GoBackToEmailStep} className="pb-6">
                    <CodeStep OnNext={CodeOnNext} />
                </WizardItem>
            </Wizard>
        </TimerProvider>
    )
}

export const Auth: FC<AppPageProps> = (props) => {
    return (
        <AppWrapper {...props}>
            <SwapDataProvider>
                <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false}>
                    <Comp />
                </FormWizardProvider>
            </SwapDataProvider>
        </AppWrapper>
    )
}