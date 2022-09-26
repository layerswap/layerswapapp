import { useRouter } from 'next/router';
import { FC } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useInterval } from '../../../hooks/useInterval';
import TokenService from '../../../lib/TokenService';
import { SwapStatus } from '../../../Models/SwapStatus';
import { ProcessSwapStep } from '../../../Models/Wizard';

const ProccessingStep: FC = () => {

    // const { prevStep, nextStep, goToStep } = useWizardState();
    const { swap } = useSwapDataState()
    const { currentStepName: currentStep } = useFormWizardState<ProcessSwapStep>()

    const { goToStep } = useFormWizardaUpdate<ProcessSwapStep>()
    const router = useRouter();
    const { swapId } = router.query;
    const { getSwap } = useSwapDataUpdate()

    useInterval(async () => {
        if (currentStep !== ProcessSwapStep.Processing)
            return true;


        const authData = TokenService.getAuthData();
        if (!authData) {
            await goToStep(ProcessSwapStep.Email)
            return;
        }
        const swap = await getSwap(swapId.toString())
        const swapStatus = swap?.data?.status;
        if (swapStatus == SwapStatus.Completed)
            await goToStep(ProcessSwapStep.Success)
        else if (swapStatus == SwapStatus.Failed || swapStatus == SwapStatus.Cancelled || swapStatus === SwapStatus.Expired)
            await goToStep(ProcessSwapStep.Failed)

    }, [currentStep, swapId], 2000)

    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
                <div className='flex place-content-center mt-20 mb-16 md:mb-8'>
                    <div className='relative'>
                        <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-primary-800 rounded-full'></div>
                    </div>
                </div>
                <div className="flex text-center place-content-center mt-1 md:mt-1">
                    <label className="block text-lg font-lighter leading-6 text-primary-text">Exchange transaction processed.</label>
                </div>
                {
                    swap?.data?.status == SwapStatus.PendingWithdrawal && <div className="flex text-center place-content-center mt-1 md:mt-1">
                        <label className="block text-lg font-lighter leading-6 text-primary-text"> Awaiting for blockchain transaction. </label>
                    </div>
                }
            </div>

        </>
    )
}

export default ProccessingStep;