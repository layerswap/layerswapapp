import { CheckIcon } from '@heroicons/react/solid';
import { FC, useCallback, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import ImtblClient from '../../../../lib/imtbl';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import LayerSwapApiClient from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';


const ConnectWalletStep: FC = () => {
    const [loading, setLoading] = useState(false)
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { walletAddress, swap } = useSwapDataState()
    const { setWalletAddress } = useSwapDataUpdate()
    const { data: { networks } } = useSettingsState()
    const network = swap && networks?.find(n => n.currencies.some(nc => nc.id === swap.data.network_currency_id))

    const handleConnect = useCallback(async () => {
        setLoading(true)
        try {
            let address: string = walletAddress
            if (!address) {
                const res = await ImtblClient.ConnectWallet()
                setWalletAddress(res.address)
                address = res.address
            }

            const layerSwapApiClient = new LayerSwapApiClient()
            const account = await layerSwapApiClient.GetNetworkAccount(network.internal_name, address)
            if (account?.data?.is_verified)
                goToStep(SwapWithdrawalStep.TransferFromWallet)
            else
                goToStep(SwapWithdrawalStep.VerifyAddress)
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [network])

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
                <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<CheckIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                    Connect
                </SubmitButton>
            </div>
        </>
    )
}

export default ConnectWalletStep;