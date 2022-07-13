import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import LayerSwapAuthApiClient from '../../../lib/userAuthApiClient';
import SubmitButton from '../../buttons/submitButton';
import CardContainer from '../../cardContainer';
import { SwapFormValues } from '../../DTOs/SwapFormValues';


interface ConfirmationStepParams {
    onDismiss: (isIntentional: boolean) => void;
    onConfirm: () => void;
    isOpen: boolean;
    formValues?: SwapFormValues,
    isOfframp: boolean,
}

const ConfirmationStep: FC = () => {

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    return (
        <>
                <div className="w-full">
                    <fieldset className="">
                        <legend className="sr-only">Confirm Swap</legend>
                    </fieldset>
                    {/* <p className='text-white mt-4 pt-2 border-t-2 border-indigo-300'>First time here? Please read the  <Link key="userGuide" href="/userguide"><a className="text-indigo-400 font-semibold underline hover:cursor-pointer"> User Guide</a></Link></p> */}
                    <div className="mt-3 sm:mt-6 text-white text-sm">
                        <SubmitButton isDisabled={false} icon={checkButtonIcon} isSubmitting={false} onClick={()=>{}}>
                            Confirm
                        </SubmitButton>
                    </div>
                </div>

        </>
    )
}

export default ConfirmationStep;