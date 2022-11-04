import { SwitchHorizontalIcon } from '@heroicons/react/outline';
import { CheckIcon, HomeIcon, ChatIcon } from '@heroicons/react/solid';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { useSettingsState } from '../../../../context/settings';
import { useSwapDataState } from '../../../../context/swap';
import ImtblClient from '../../../../lib/imtbl';
import LayerSwapApiClient from '../../../../lib/layerSwapApiClient';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';


const VerifyAddressStep: FC = () => {
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { walletAddress, swap } = useSwapDataState()
    const { networks } = useSettingsState()
    const [loading, setLoading] = useState(false)

    const network = swap && networks?.find(n => n.currencies.some(nc => nc.id === swap.network_currency_id))

    const handleVerify = useCallback(async () => {
        setLoading(true)
        try {
            const imtblClient = new ImtblClient(network.internal_name)
            const res = await imtblClient.Sign()
            const layerSwapApiClient = new LayerSwapApiClient()
            layerSwapApiClient.CreateNetworkAccount({ signature: res.result, address: walletAddress, network: network.internal_name, note: "" })
            goToStep(SwapWithdrawalStep.TransferFromWallet)
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [walletAddress, network])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium text-white leading-6 text-left">
                            Verify address
                        </h3>
                    </div>
                </div>
                <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleVerify} icon={<CheckIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                    Verify
                </SubmitButton>
            </div>
        </>
    )
}

export default VerifyAddressStep;

