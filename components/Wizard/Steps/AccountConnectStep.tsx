import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const AccountConnectStep: FC = () => {

    const { prevStep, nextStep } = useWizardState();

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2.5 fill-pink-primary" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <label className="block text-lg font-lighter leading-6 text-white"> Important </label>
                </div>
                <div className="flex items-center mt-2">
                    <label className="block text-lg font-lighter leading-6 text-light-blue"> Make sure to authorize at least 90$. Follow this <Link key="userGuide" href="/userguide"><a className="font-lighter text-darkblue underline hover:cursor-pointer">Step by step guide</a></Link></label>
                </div>
                <div className="flex items-center mt-12 md:mt-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2.5 fill-pink-primary" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <label className="block text-lg font-lighter leading-6 text-white"> Note </label>
                </div>
                <div className="flex items-center mt-2">
                    <label className="block text-lg font-lighter leading-6 text-light-blue"> Even after authorization Bransfer can't initiate a withdrawal without your explicit confirmation.</label>
                </div>
                <div>
                    <label className="block font-normal text-light-blue text-sm mt-12">
                    You will leave Bransfer and be securely redirected to Conibase authorization page.
                    </label>
                </div>
                <div className="text-white text-sm mt-3">
                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={nextStep}>
                        Confirm
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default AccountConnectStep;