import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';
import CardContainer from '../../cardContainer';
import { SwapFormValues } from '../../DTOs/SwapFormValues';

const UserLoginStep: FC = () => {

    const [email, setEmail] = useState()
    const { prevStep, nextStep } = useWizardState();

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    return (
        <>
            <div className="w-full px-6 md:px-12 py-12 grid  grid-flow-row">
                <p className='mb-10 text-white mt-4 pt-2 '>We will send 4 digits code to your email for the verification.</p>
                <div>
                    <label htmlFor="amount" className="block text-base font-medium">
                        Email
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="Your email"
                            autoCorrect="off"
                            type="text"
                            name="Email"
                            id="Email"
                            className="focus:ring-indigo-500 focus:border-indigo-500 pr-36 block bg-gray-800 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                            onChange={(e: any) => {
                                setEmail(e?.target?.value)
                            }}
                        />
                    </div>
                    <div className="flex items-center">
                        <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label className="ml-2 block text-sm "> Remember me </label>
                    </div>
                </div>
                <div className="mt-3 sm:mt-6 text-white text-sm mt-auto">
                    <SubmitButton isDisabled={false} icon={checkButtonIcon} isSubmitting={false} onClick={nextStep}>
                        Get the code
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default UserLoginStep;