import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const FailedPage: FC = () => {

    const { prevStep, nextStep } = useWizardState();

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div className='flex place-content-center mb-16 md:mb-8'>
                    <div className='relative'>
                        <div className='absolute top-0 w-12 h-12 scale-150 opacity-50 bg bg-red-failed rounded-full animate-ping'></div>
                        <div className='relative top-0 w-12 h-12 opacity-50 bg bg-red-failed rounded-full animate-ping'></div>
                        <div className='absolute -top-1.5 -left-1.5 '>
                            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none">
                                <circle cx="30" cy="30" r="30" fill="#E43636"/>
                                <path d="M20 41L40 20" stroke="white" stroke-width="3.15789" stroke-linecap="round"/>
                                <path d="M20 20L40 41" stroke="white" stroke-width="3.15789" stroke-linecap="round"/>
                            </svg>
                        </div>                        
                    </div>
                </div>
                <div className="flex items-center text-center mb-14 md:mb-6 mx-5 md:mx-24">
                    <label className="block text-lg font-lighter leading-6 text-light-blue">Your swap successfully completed. You can view it in the explorer, or go ahead swap more!</label>
                </div>
                <div className="mb-2.5 md:-6 w-full justify-center">
                    <Link key="/" href="/">
                        <a className="flex text-lg h-12 md:h-6 font-lighter leading-6 text-darkblue place-content-center p-2.5 md:p-0 border md:border-none rounded-lg border-darkblue block">
                            Swap more
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </a>
                    </Link>
                </div>
                <div className="text-white text-sm md:mt-3 mt-0">
                    <SubmitButton isDisabled={false} defaultStyle="bg-pink-primary text-lg" icon="" isSubmitting={false} onClick={prevStep}>
                        View in Eplorer
                    </SubmitButton>

                </div>
            </div>

        </>
    )
}

export default FailedPage;