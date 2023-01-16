import { CheckIcon, LinkIcon, SwitchHorizontalIcon } from '@heroicons/react/solid';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import LayerSwapApiClient, { UserExchangesData } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import { classNames } from '../../../utils/classNames';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';
import shortenAddress from "../../../utils/ShortenAddress"
import { GetSourceDestinationData } from '../../../../helpers/swapHelper';
import { SwapStatus } from '../../../../Models/SwapStatus';
import { parseJwt } from '../../../../lib/jwtParser';
import TokenService from '../../../../lib/TokenService';
import useSWR from 'swr';
import { ApiResponse } from '../../../../Models/ApiResponse';
import { OpenLink } from '../../../../lib/openLink';
import AccountConnectStep from '../CoinbaseAccountConnectStep';


const CoinbaseInternalWithdrawal: FC = () => {
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { swap } = useSwapDataState()
    const { networks, exchanges, currencies, discovery: { resource_storage_url } } = useSettingsState()
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()

    const { network, exchange } = GetSourceDestinationData({ swap, currencies, exchanges, networks, resource_storage_url })


    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swap.status != SwapStatus.UserTransferPending)
            goToStep(swapStatusStep)
    }, [swapStatusStep, swap])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {
            const layerswapApiClient = new LayerSwapApiClient()
            await layerswapApiClient.WithdrawFromExchange(swap.id, swap.source_exchange)
            setTransferDone(true)
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [swap, network])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium text-white leading-6 text-left">
                            Complete the transfer
                        </h3>
                    </div>
                    <p className='leading-5'>
                        We’ll help you to send crypto from your Coinbase account
                    </p>
                </div>
                {
                    <SubmitButton isDisabled={loading || transferDone} isSubmitting={loading || transferDone} onClick={handleTransfer} icon={<SwitchHorizontalIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                        Transfer
                    </SubmitButton>
                }
            </div>
        </>
    )
}


export default CoinbaseInternalWithdrawal;