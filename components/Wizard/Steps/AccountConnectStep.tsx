import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const AccountConnectStep: FC = () => {

    const { prevStep, nextStep } = useWizardState();

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <label className="block text-lg font-medium leading-6 text-white"> Important </label>
                </div>
                <div className="flex items-center mt-2">
                    <label className="block text-lg font-lighter leading-6 text-light-blue"> Make sure to authorize at least 90$. Follow this <Link key="userGuide" href="/userguide"><a className="font-lighter text-darkblue underline hover:cursor-pointer">Step by step guide</a></Link></label>
                </div>
                <div className="flex items-center mt-12 md:mt-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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