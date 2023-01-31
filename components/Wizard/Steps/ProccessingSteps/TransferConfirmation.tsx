import { FC, useEffect } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { useSettingsState } from '../../../../context/settings';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapType } from '../../../../lib/layerSwapApiClient';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import { TrackEvent } from '../../../../pages/_document';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';

const TransferConfirmationStep: FC = () => {

    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { swap } = useSwapDataState()
    const { setInterval } = useSwapDataUpdate()
    const settings = useSettingsState()

    const source_display_name = settings?.exchanges?.find(e => e.internal_name == swap?.source_exchange)?.display_name

    useEffect(() => {
        setInterval(10000)
        return () => setInterval(0)
    }, [])

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swapStatusStep !== SwapWithdrawalStep.TransferConfirmation) {
            goToStep(swapStatusStep)
        }
    }, [swapStatusStep])

    return (
        <>
            <div className="w-full py-12 grid grid-flow-row">
                <div className='flex place-content-center mt-20 mb-16 md:mb-8'>
                    <div className='relative'>
                        <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-primary-800 rounded-full'></div>
                    </div>
                </div>
                <div className="flex flex-col text-center place-content-center mt-1 text-lg font-lighter text-primary-text">
                    <p className='text-white'>
                        Transfer from {source_display_name} is completed
                    </p>
                    <div className='text-sm'>
                        <p>Waiting for the transfer to get confirmed</p>
                        <p>Confirmations: <span className='text-white'>{swap?.input_transaction?.confirmations ?? 0}</span>/{swap?.input_transaction?.max_confirmations}</p>
                    </div>
                </div>
            </div>
        </>
    )
}

export default TransferConfirmationStep;