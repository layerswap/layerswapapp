import { SwitchHorizontalIcon } from '@heroicons/react/outline';
import { CheckIcon, HomeIcon, ChatIcon } from '@heroicons/react/solid';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';


const TransferStep: FC = () => {
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()

    const handleTransfer = ()=>{
        //TODO implement transfer, apply_network_input and polling
    }

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium text-white leading-6 text-left">
                            Transfer crypto                         
                        </h3>
                    </div>
                </div>
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleTransfer} icon={<CheckIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                    Transfer
                </SubmitButton>
            </div>
        </>
    )
}

export default TransferStep;

