import { CheckIcon } from '@heroicons/react/outline';
import { FC, useState } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const SwapConfirmationStep: FC = () => {

    const [email, setEmail] = useState()
    const { prevStep, nextStep } = useWizardState();
    const swapData = useSwapDataState()
    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>We will send 4 digits code to your email for the verification.</p>
                <div>
                    
                    <div className="flex items-center md:mb-3 mb-5">
                        <input id="remember-me" name="remember-me" type="checkbox" className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label className="ml-3 block text-lg leading-6 text-light-blue"> The provided address is your <span className='text-white'>{swapData.network?.name}</span> wallet address </label>
                    </div>
                    <div className="flex items-center mb-12 md:mb-11">
                        <input id="remember-me" name="remember-me" type="checkbox" className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label className="ml-3 block text-lg leading-6 text-light-blue"> Providing wrong information will result in a loss of funds </label>
                    </div>

                    
                </div>
                <div className="text-white text-sm mt-auto">
                    <div className="flex items-center mb-2">
                        <span className="block text-sm leading-6 text-light-blue"> First time here? Please read the User Guide </span>
                    </div>
                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={nextStep}>
                        Confirm
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default SwapConfirmationStep;