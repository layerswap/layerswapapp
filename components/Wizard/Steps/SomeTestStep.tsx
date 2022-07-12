import { CheckIcon, InformationCircleIcon } from '@heroicons/react/outline';
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
            <div className='mb-5'>
                <div className="flex items-center">
                    <InformationCircleIcon className='w-7 mr-1 text-pink-primary-600' />
                    <label className="block text-base font-medium leading-6"> Why </label>
                </div>
                <div className="flex items-center ml-6 pl-2.5">
                    <label className="block text-base font-normal leading-6"> Layerswap uses your API keys to access your withrawal history and verify your payments. </label>
                </div>
            </div>
        </>
    )
}

export default SomeTestStep;