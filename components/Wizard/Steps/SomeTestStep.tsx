import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';
import CardContainer from '../../cardContainer';
import { SwapFormValues } from '../../DTOs/SwapFormValues';
import Example from '../../swapHistoryComponent';
import SwapDetails from '../../swapDetailsComponent';


interface ConfirmationStepParams {
    onDismiss: (isIntentional: boolean) => void;
    onConfirm: () => void;
    isOpen: boolean;
    formValues?: SwapFormValues,
    isOfframp: boolean,
}

const SomeTestStep: FC = () => {

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            Test step
        </>
    )
}

export default SomeTestStep;