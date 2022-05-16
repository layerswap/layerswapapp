import { CheckIcon } from '@heroicons/react/outline';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const UserLoginStep: FC = () => {

    const [email, setEmail] = useState()
    const { prevStep, nextStep } = useWizardState();

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>We will send 4 digits code to your email for the verification.</p>
                <div>
                    <label htmlFor="amount" className="block font-normal text-light-blue text-sm">
                        Email
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-12 md:mb-11">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="Your email"
                            autoCorrect="off"
                            type="text"
                            name="Email"
                            id="Email"
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                            placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                            onChange={(e: any) => {
                                setEmail(e?.target?.value)
                            }}
                        />
                    </div>
                    <div className="flex items-center md:mb-3 mb-5">
                        <input id="remember-me" name="remember-me" type="checkbox" className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label className="ml-3 block text-lg leading-6 text-light-blue"> The provided address is your <span className='text-white'>Loopring</span> wallet address </label>
                    </div>
                    <div className="flex items-center mb-12 md:mb-11">
                        <input id="remember-me" name="remember-me" type="checkbox" className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label className="ml-3 block text-lg leading-6 text-light-blue"> Providing wrong information will result in a loss of funds </label>
                    </div>
                </div>
                <div className="text-white text-sm mt-auto">
                    <SubmitButton isDisabled={false} defaultStyle="bg-pink-primary text-lg" icon="" isSubmitting={false} onClick={prevStep}>
                        Send
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default UserLoginStep;