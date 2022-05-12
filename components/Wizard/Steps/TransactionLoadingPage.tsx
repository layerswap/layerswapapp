import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const TransactionLoadingPage: FC = () => {

    const { prevStep, nextStep } = useWizardState();

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div className="flex place-content-center mb-7 mt-20 animate-spin-slow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="53" height="51" viewBox="0 0 53 51" fill="none">
                        <path d="M26.502 2V6.7" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M38.2951 5.14795L35.9365 9.21822" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M46.9275 13.75L42.8423 16.1" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M50.0873 25.5H45.3701" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M46.9275 37.2499L42.8423 34.8999" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M38.2951 45.8516L35.9365 41.7812" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M26.502 49V44.3" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14.709 45.8516L17.0676 41.7812" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6.07617 37.2499L10.1613 34.8999" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2.91602 25.5H7.63316" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6.07617 13.75L10.1613 16.1" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14.709 5.14795L17.0676 9.21822" stroke="#4D6FB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div className="flex text-center place-content-center mt-2">
                    <label className="block text-lg font-lighter leading-6 text-light-blue"> Please wait. </label>
                </div>
                <div className="flex text-center place-content-center mt-4 md:mt-2">
                    <label className="block text-lg font-lighter leading-6 text-light-blue"> We'ar checking your transacton, It'll just take a moment. </label>
                </div>
            </div>

        </>
    )
}

export default TransactionLoadingPage;