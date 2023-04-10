import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useFormWizardaUpdate, useFormWizardState } from '../context/formWizardProvider';
import { AuthStep } from '../Models/Wizard';
import CodeStep from './Wizard/Steps/CodeStep';
import EmailStep from './Wizard/Steps/EmailStep';
import { AllPendingSwapStep } from './Wizard/Steps/PendingSwapsStep';
import Wizard from './Wizard/Wizard';
import WizardItem from './Wizard/WizardItem';

function GuestCard() {
    const { goToStep } = useFormWizardaUpdate()
    const { goBack, noToolBar } = useFormWizardState()
    const router = useRouter();
    const { redirect } = router.query;

    const CodeOnNext = useCallback(async () => {
        toast.success("You are successfully logged in.")
    }, [redirect]);
    const GoBackToEmailStep = useCallback(() => goToStep(AuthStep.Email, "back"), [])
    const GoToCodeStep = useCallback(() => goToStep(AuthStep.Code), [])

    return (
        <div className='mt-10'>
            <Wizard>
                <WizardItem StepName={AuthStep.Email} fitHeight>
                    <div className={noToolBar ? `p-6 border border-darkblue-500 rounded-md` : "pt-6"}>
                        <EmailStep OnNext={GoToCodeStep} disclosureLogin />
                    </div>
                </WizardItem>
                <WizardItem StepName={AuthStep.Code} GoBack={GoBackToEmailStep} fitHeight>
                    <div className={noToolBar ? `p-6 border border-darkblue-500 rounded-md` : "pt-6"}>
                        {
                            goBack &&
                            <button onClick={goBack} className="justify-self-start text-xs text-primary-text flex items-center hover:text-primary-text/70 cursor-pointer space-x-1" style={{ visibility: false ? 'hidden' : 'visible' }}>
                                <ArrowLeft className='h-3' />
                                <span>Edit email</span>
                            </button>
                        }
                        <CodeStep OnNext={CodeOnNext} disclosureLogin />
                    </div>
                </WizardItem>
                <WizardItem StepName={AuthStep.PendingSwaps} fitHeight>
                    <AllPendingSwapStep />
                </WizardItem>
            </Wizard>
        </div>
    );
}

export default GuestCard;

