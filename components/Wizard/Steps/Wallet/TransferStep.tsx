import { SwitchHorizontalIcon } from '@heroicons/react/outline';
import { CheckIcon, HomeIcon, ChatIcon } from '@heroicons/react/solid';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { useSettingsState } from '../../../../context/settings';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { useInterval } from '../../../../hooks/useInterval';
import ImtblClient from '../../../../lib/imtbl';
import LayerSwapApiClient from '../../../../lib/layerSwapApiClient';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';


const TransferStep: FC = () => {
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { walletAddress, swap } = useSwapDataState()
    const { setInterval } = useSwapDataUpdate()
    const [loading, setLoading] = useState(false)
    const [txidApplied, setTxidApplied] = useState(false)
    const [applyCount, setApplyCount] = useState(0)
    const [transactionId, setTransactionId] = useState<string>()
    const { networks } = useSettingsState()
    const network = swap && networks?.find(n => n.currencies.some(nc => nc.id === swap.network_currency_id))

    const applyNetworkInput = useCallback(async () => {
        try {
            setApplyCount(old => old + 1)
            const layerSwapApiClient = new LayerSwapApiClient()
            await layerSwapApiClient.ApplyNetworkInput(swap.id, transactionId)
        }
        catch (e) {
            setTxidApplied(true)
        }
    }, [transactionId])

    useInterval(
        applyNetworkInput,
        transactionId && !txidApplied && applyCount < 10 ? 8000 : null,
    )

    useEffect(() => {
        return () => setInterval(0)
    }, [])

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep)
            goToStep(swapStatusStep)
    }, [swapStatusStep])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {
            const imtblClient = new ImtblClient(network.internal_name)
            const res = await imtblClient.Transfer(swap.requested_amount.toString(), swap.additonal_data.deposit_address)
            const transactionRes = res?.result?.[0]
            if (!transactionRes)
                toast('No transaction')
            if (transactionRes.status == "error") {
                toast(transactionRes.message)
            }
            else if (transactionRes.status == "success") {
                setTransactionId(transactionRes.txId.toString())
                setInterval(2000)
            }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [walletAddress, swap, network])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium text-white leading-6 text-left">
                            Transfer crypto
                        </h3>
                    </div>
                </div>
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleTransfer} icon={<CheckIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                    Transfer
                </SubmitButton>
            </div>
        </>
    )
}

export default TransferStep;

