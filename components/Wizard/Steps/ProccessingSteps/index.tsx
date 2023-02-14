import { FC, useEffect } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { useSettingsState } from '../../../../context/settings';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapStatus } from '../../../../Models/SwapStatus';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';
import Steps from '../StepsComponent';
import { ProcessingComponent, ProcessingSteps } from './ProcessingComponent';

const ProcessingStep: FC = () => {

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
        if (swapStatusStep && swapStatusStep !== (SwapWithdrawalStep.DepositPending || SwapWithdrawalStep.OutputTransferProccessing || SwapWithdrawalStep.TransferConfirmation)) {
            goToStep(swapStatusStep)
        }
    }, [swapStatusStep])

    let status = 0
    useEffect(() => {
        switch (swap.status) {
            case SwapStatus.UserTransferPending:
                if (swap.has_pending_deposit && !swap.input_transaction) status = 1
                else if (swap.input_transaction) status = 2
                break
            case SwapStatus.LsTransferPending:
                status = 3
                break
        }
    }, [swapStatusStep])

    const progress = [
        { name: 'Source transfer', status: status > 1 ? 'complete' : 'current' },
        {
            name: 'Transfer confirmation',
            status: status === 2 && 'current' || status === 3 && 'complete' || status === 1 && 'upcoming',
        },
        { name: 'Destination transfer', status: status < 3 ? 'upcoming' : 'current' },
    ]

    const steps: ProcessingSteps[] = [
        { name: SwapWithdrawalStep.DepositPending, header: `Transfer from ${source_display_name} is in progress`, description: <span>Estimated time: <span className='text-white'>less than {swap?.source_exchange ? '10' : '3'} minutes</span></span>, status: 'active' },
        { name: SwapWithdrawalStep.OutputTransferProccessing, header: `Your assets are on their way`, description: <span>Estimated time: <span className='text-white'>less than 2 minutes</span></span>, status: swapStatusStep === SwapWithdrawalStep.OutputTransferProccessing ? 'active' : 'inactive' },
        { name: SwapWithdrawalStep.TransferConfirmation, header: `Transfer from ${source_display_name} is completed`, description: <div><p>Waiting for the transfer to get confirmed</p><p>Confirmations: <span className='text-white'>{swap?.input_transaction?.confirmations ?? 0}</span>/{swap?.input_transaction?.max_confirmations}</p></div>, status: swapStatusStep === SwapWithdrawalStep.TransferConfirmation ? 'active' : 'inactive' },
    ]

    return (
        <>
            <div className="w-full items-center flex flex-col h-full">
                <ProcessingComponent processingSteps={steps} />
                <Steps steps={progress} />
            </div>
        </>
    )
}

export default ProcessingStep;