import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const CodeInputStep: FC = () => {

    const [email, setEmail] = useState()
    const { prevStep, nextStep } = useWizardState();

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div>
                    <label htmlFor="amount" className="block font-normal text-light-blue text-sm">
                        Your Email Code
                    </label>
                    <div className="relative rounded-md shadow-sm mt-2 mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="XXXXXX"
                            autoCorrect="off"
                            type="text"
                            maxLength={6}
                            name="Code"
                            id="Code"
                            className="h-12 text-2xl pl-5 focus:ring-pink-primary text-center focus:border-pink-primary border-darkblue-100 block
                            placeholder:text-light-blue placeholder:text-2xl placeholder:h-12 placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                            onKeyPress={e => {
                                isNaN(Number(e.key)) && e.preventDefault()
                            }}
                        />
                    </div>
                </div>
                <div className="text-white text-sm mt-auto mb-4 mt-4">
                    <SubmitButton isDisabled={false}  icon="" isSubmitting={false} onClick={nextStep}>
                        Confirm
                    </SubmitButton>
                </div>
                <div className="flex items-center">
                    <label className="block text-base font-lighter leading-6 text-light-blue"> Did not receive the verification?  <Link key="/" href="/"><a className="font-lighter text-darkblue underline hover:cursor-pointer">Resend again</a></Link></label>
                </div>
            </div>

        </>
    )
}

export default CodeInputStep;