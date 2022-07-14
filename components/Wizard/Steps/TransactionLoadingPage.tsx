import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const TransactionLoadingPage: FC = () => {

    const { prevStep, nextStep } = useWizardState();

    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
                <div className='flex place-content-center mt-20 mb-16 md:mb-8'>
                    <div className='relative'>
                        <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
                        <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
                        <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-darkBlue rounded-full'></div>
                    </div>
                </div>
                <div className="flex text-center place-content-center mt-2">
                    <label className="block text-lg font-lighter leading-6 text-pink-primary-300"> Please wait. </label>
                </div>
                <div className="flex text-center place-content-center mt-4 md:mt-2">
                    <label className="block text-lg font-lighter leading-6 text-pink-primary-300"> We'ar checking your transacton, It'll just take a moment. </label>
                </div>
            </div>

        </>
    )
}

export default TransactionLoadingPage;