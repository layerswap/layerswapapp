import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useEffect, useState } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const ProccessingStep: FC<{ current: boolean }> = ({ current }) => {

    const { prevStep, nextStep } = useWizardState();
    const {swapFormData} = useSwapDataState()
    useEffect(() => {
        if (current)
            setTimeout(() => {
                console.log("nexting now")
                nextStep()
            }, 5000);
    }, [current])

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div className='flex place-content-center mt-20 mb-16 md:mb-8'>
                    <div className='relative'>
                        <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
                        <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
                        <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-pink-primary-800 rounded-full'></div>
                    </div>
                </div>
                <div className="flex text-center place-content-center mt-1 md:mt-1">
                    <label className="block text-lg font-lighter leading-6 text-light-blue"> Awaiting for {swapFormData?.exchange?.name} confirmation </label>
                </div>
            </div>

        </>
    )
}

export default ProccessingStep;