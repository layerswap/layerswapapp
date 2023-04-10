import { FC, useEffect } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapStatus } from '../../../../Models/SwapStatus';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';

const ProccessingWalletTransactionStep: FC = () => {
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { swap } = useSwapDataState()
    const { setInterval } = useSwapDataUpdate()

    useEffect(() => {
        setInterval(10000)
        return () => setInterval(0)
    }, [])

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && !(swap?.status == SwapStatus.UserTransferPending && swap.has_pending_deposit && !swap.input_transaction) && swap.status != SwapStatus.UserTransferPending)
            goToStep(swapStatusStep)
    }, [swapStatusStep, swap])

    return (
        <>
            <div className="w-full py-12 grid grid-flow-row">
                <div className='md:text-3xl text-lg font-bold text-white leading-6 text-center'>
                    Waiting for the transfer
                </div>
                <div className='flex place-content-center mt-20 mb-16 md:mb-8'>
                    <div className='relative'>
                        <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-primary-800 rounded-full'></div>
                    </div>
                </div>
                <div className="flex flex-col text-center place-content-center mt-1 text-lg font-lighter text-primary-text">
                    <p className="text-base font-medium space-y-6 text-primary-text text-center">
                        Please confirm the transfer request with your wallet to complete the swap
                    </p>
                </div>
            </div>
        </>
    )
}

export default ProccessingWalletTransactionStep;