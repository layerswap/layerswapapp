import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';
import CardContainer from '../../cardContainer';
import { SwapFormValues } from '../../DTOs/SwapFormValues';
import IframeResizer from 'iframe-resizer-react';


interface ConfirmationStepParams {
    onDismiss: (isIntentional: boolean) => void;
    onConfirm: () => void;
    isOpen: boolean;
    formValues?: SwapFormValues,
    isOfframp: boolean,
}

const SomeTestStep: FC = () => {

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>
    const { prevStep, nextStep } = useWizardState();

    const [isOpen, setIsOpen] = useState(false)

    return (
        <>

            <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={() => setIsOpen(true)}>
                Test
            </SubmitButton>

            <div className="text-white text-base">
                <div className='relative overflow-hidden pb-96'>

                    <iframe src="https://stonly.com/guide/en/scrolled-article-template-PLOQniHQ1D/Steps/1502583" className='overflow-hidden border-0 self-center absolute w-full h-full'></iframe>
                    <IframeResizer></IframeResizer>
                </div>
            </div>

        </>
    )
}

export default SomeTestStep;