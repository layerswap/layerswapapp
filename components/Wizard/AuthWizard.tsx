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
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import { ParsedUrlQuery } from "querystring";


const AuthWizard: FC = () => {
    const { goToStep } = useFormWizardaUpdate()
    const router = useRouter();
    const { redirect } = router.query;

    const CodeOnNext = useCallback(async () => {
        await router.push(resolveRedirectUrl(redirect?.toString(), router.query))
        plausible(TrackEvent.SignedIn)
    }, [redirect]);

    const GoBackToEmailStep = useCallback(() => goToStep(AuthStep.Email, "back"), [])
    const GoToCodeStep = useCallback(() => goToStep(AuthStep.Code), [])

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <TimerProvider>
            <Wizard wizardId="auth">
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

function resolveRedirectUrl(pathname: string | undefined, query: ParsedUrlQuery) {

    if (!pathname) return '/'

    const pathnameArray = pathname && pathname.split('/') || []

    if (pathname?.startsWith('/swap')) return {
        pathname: '/swap/[swapId]',
        query: { ...resolvePersistantQueryParams(query), organization: encodeURIComponent(pathnameArray[1]) }
    }
    else return { pathname: encodeURIComponent(pathname), query: { ...resolvePersistantQueryParams(query) } }
}

export default AuthWizard;