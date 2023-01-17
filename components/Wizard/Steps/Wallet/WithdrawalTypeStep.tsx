import { CheckIcon, XIcon } from '@heroicons/react/solid';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton, { DoubleLineText } from '../../../buttons/submitButton';
import { useSwapDataState } from '../../../../context/swap';
import toast from 'react-hot-toast';
import LayerSwapApiClient from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';
import { GetSourceDestinationData } from '../../../../helpers/swapHelper';
import { SwapStatus } from '../../../../Models/SwapStatus';
import { useRouter } from 'next/router';
import { KnownwErrorCode } from '../../../../Models/ApiError';


const WithdrawalTypeStep: FC = () => {
    const { swap } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const router = useRouter();
    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swap.status != SwapStatus.UserTransferPending)
            goToStep(swapStatusStep)
    }, [swapStatusStep, swap])

    const handleManualTransfer = useCallback(async () => {
        goToStep(SwapWithdrawalStep.CoinbaseManualWithdrawal)
    }, [])

    const handleInternalTransfer = useCallback(async () => {
        const layerswapApiClient = new LayerSwapApiClient(router)
        try {
            const res = await layerswapApiClient.GetExchangeAccount(swap?.source_exchange, 1)
            if (res.data) {
                goToStep(SwapWithdrawalStep.CoinbaseInternalWithdrawal)
            }
            else {
                goToStep(SwapWithdrawalStep.AuthorizeCoinbaseWithdrawal)
            }
        }
        catch (e) {
            if (e?.response?.data?.error?.code === KnownwErrorCode.NOT_FOUND)
                goToStep(SwapWithdrawalStep.AuthorizeCoinbaseWithdrawal)
            else
                toast(e?.response?.data?.error?.message || e.message)
        }
    }, [swap])

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
                <div className="flex flex-row text-white text-base space-x-2">
                    <div className='basis-1/3'>
                        <SubmitButton onClick={handleManualTransfer} text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<XIcon className='h-5 w-5' />}>
                            <DoubleLineText
                                colorStyle='mltln-text-dark'
                                primaryText='Manully'
                                secondarytext='from coinbase'
                                reversed={true}
                            />
                        </SubmitButton>
                    </div>
                    <div className='basis-2/3'>
                        <SubmitButton onClick={handleInternalTransfer} button_align='right' text_align='left' isDisabled={false} isSubmitting={false} icon={<CheckIcon className="h-5 w-5" aria-hidden="true" />} >
                            <DoubleLineText
                                colorStyle='mltln-text-light'
                                primaryText='Directly'
                                secondarytext='from layerswap'
                                reversed={true}
                            />
                        </SubmitButton>
                    </div>
                </div>
            </div>
        </>
    )
}



export default WithdrawalTypeStep;