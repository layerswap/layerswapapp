import { CheckIcon } from '@heroicons/react/solid';
import { FC } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import { ConnectWallet } from '../../../../lib/imtbl';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';


const ConnectWalletStep: FC = () => {
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { walletAddress } = useSwapDataState()
    const { setWalletAddress } = useSwapDataUpdate()
    const handleConnect = async () => {
        try {
            const res = await ConnectWallet()
            setWalletAddress(res.address)
            
            goToStep(SwapWithdrawalStep.VerifyAddress)
        }
        catch (e) {
            toast(e.message)
        }        
    }

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium text-white leading-6 text-left">
                            Connect wallet
                        </h3>
                    </div>
                </div>
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConnect} icon={<CheckIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                    Connect
                </SubmitButton>
            </div>
        </>
    )
}

export default ConnectWalletStep;