import { CheckIcon } from '@heroicons/react/outline';
import { FC, useState } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const SwapConfirmationStep: FC = () => {
    const [confirm_right_wallet, setConfirm_right_wallet] = useState(false)
    const [confirm_right_information, setConfirm_right_information] = useState(false)

    const { prevStep, nextStep } = useWizardState();
    const swapData = useSwapDataState()
    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    const handleConfirm_right_wallet = (e) => {
        setConfirm_right_wallet(e.target.checked)
    }
    const handleConfirm_right_information = (e) => {
        setConfirm_right_information(e.target.checked)
    }

    /*
    
    You are requesting a transfer of 90 LRC from your Coinbase exchange account to your Loopring wallet (0x437...2768)
To continue, you have to confirm that
    */
    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>
                    You are requesting a transfer of {swapData?.amount} {swapData.currency?.name} from your {swapData.exchange?.name} exchange account to your {swapData.network?.name} wallet ({`${swapData?.destination_address?.substr(0, 5)}...${swapData?.destination_address?.substr(swapData?.destination_address?.length - 4, swapData?.destination_address?.length - 1)}`})
                </p>
                <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>
                    To continue, you have to confirm that
                </p>
                <div>

                    <div className="flex items-center md:mb-3 mb-5">
                        <input onChange={handleConfirm_right_wallet} id="confirm_right_wallet" name="confirm_right_wallet" type="checkbox" className="cursor-pointer h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor='confirm_right_wallet' className="cursor-pointer  ml-3 block text-lg leading-6 text-light-blue"> The provided address is your <span className='text-white'>{swapData.network?.name}</span> wallet address </label>
                    </div>
                    <div className="flex items-center mb-12 md:mb-11">
                        <input onChange={handleConfirm_right_information} id="confirm_right_information" name="confirm_right_information" type="checkbox" className=" cursor-pointer h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor='confirm_right_information' className="cursor-pointer ml-3 block text-lg leading-6 text-light-blue"> Providing wrong information will result in a loss of funds </label>
                    </div>


                </div>
                <div className="text-white text-sm mt-auto">
                    <div className="flex items-center mb-2">
                        <span className="block text-sm leading-6 text-light-blue"> First time here? Please read the User Guide </span>
                    </div>
                    <SubmitButton isDisabled={!confirm_right_wallet || !confirm_right_information} icon="" isSubmitting={false} onClick={nextStep}>
                        Confirm
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default SwapConfirmationStep;