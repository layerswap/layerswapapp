import { CheckIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/solid';
import { FC, useState } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const SwapConfirmationStep: FC = () => {
    const [confirm_right_wallet, setConfirm_right_wallet] = useState(false)
    const [confirm_right_information, setConfirm_right_information] = useState(false)

    const { prevStep, nextStep, loading, error } = useWizardState();
    const { swapFormData } = useSwapDataState()
    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    const handleConfirm_right_wallet = (e) => {
        setConfirm_right_wallet(e.target.checked)
    }
    const handleConfirm_right_information = (e) => {
        setConfirm_right_information(e.target.checked)
    }


    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                {
                    error &&
                    <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-light-blue">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                }
                <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>
                    You are requesting a transfer of {swapFormData?.amount} {swapFormData?.currency?.name} from your {swapFormData?.exchange?.name} exchange account to your {swapFormData?.network?.name} wallet ({`${swapFormData?.destination_address?.substr(0, 5)}...${swapFormData?.destination_address?.substr(swapFormData?.destination_address?.length - 4, swapFormData?.destination_address?.length - 1)}`})
                </p>
                <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>
                    To continue, you have to confirm that
                </p>
                <div>
                    <div className="flex items-center md:mb-3 mb-5">
                        <input
                            onChange={handleConfirm_right_wallet}
                            id="confirm_right_wallet"
                            name="confirm_right_wallet"
                            type="checkbox"
                            className="cursor-pointer h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor='confirm_right_wallet' className="cursor-pointer  ml-3 block text-lg leading-6 text-light-blue"> The provided address is your <span className='text-white'>{swapFormData?.network?.name}</span> wallet address </label>
                    </div>
                    <div className="flex items-center mb-12 md:mb-11">
                        <input
                            onChange={handleConfirm_right_information}
                            id="confirm_right_information"
                            name="confirm_right_information"
                            type="checkbox"
                            className="cursor-pointer h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor='confirm_right_information' className="cursor-pointer ml-3 block text-lg leading-6 text-light-blue"> Providing wrong information will result in a loss of funds </label>
                    </div>
                </div>
                <div className="text-white text-sm mt-auto">
                    <div className="flex items-center mb-2">
                        <span className="block text-sm leading-6 text-light-blue"> First time here? Please read the User Guide </span>
                    </div>
                    <SubmitButton isDisabled={!confirm_right_wallet || !confirm_right_information || loading} icon="" isSubmitting={loading} onClick={nextStep}>
                        Confirm
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default SwapConfirmationStep;