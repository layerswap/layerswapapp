import { useRouter } from 'next/router';
import { FC, useEffect } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataUpdate } from '../../../context/swap';
import TokenService from '../../../lib/TokenService';
import { SwapStatus } from '../../../Models/SwapStatus';
import { ProcessSwapStep, SwapWizardSteps } from '../../../Models/Wizard';
import toast from "react-hot-toast";

const OverviewStep: FC = () => {
    const { setLoading: setLoadingWizard, goToStep } = useFormWizardaUpdate<ProcessSwapStep>()
    const { currentStepName: currentStep } = useFormWizardState<ProcessSwapStep>()

    const router = useRouter();
    const { swapId } = router.query;

    const { getSwap } = useSwapDataUpdate()

    useEffect(() => {
        (async () => {
            try {
                if (currentStep !== ProcessSwapStep.Overview)
                    return true
                const authData = TokenService.getAuthData();
                if (!authData) {
                    goToStep(ProcessSwapStep.Email)
                    setLoadingWizard(false)
                    return;
                }
                const swap = await getSwap(swapId.toString())
                const { payment } = swap?.data || {};
                const swapStatus = swap?.data?.status;
                const paymentStatus = payment?.status
                if (swapStatus == SwapStatus.Completed)
                    goToStep(ProcessSwapStep.Success)
                else if (swapStatus == SwapStatus.Failed || paymentStatus == 'closed')
                    goToStep(ProcessSwapStep.Failed)
                else if (swapStatus == SwapStatus.Pending)
                    goToStep(ProcessSwapStep.Processing)
                else {
                    if (swap?.data?.type === "off_ramp")
                        goToStep(ProcessSwapStep.OffRampWithdrawal)
                    else if (payment?.manual_flow_context)
                        goToStep(ProcessSwapStep.Withdrawal)
                    else if (payment?.external_flow_context)
                        goToStep(ProcessSwapStep.ExternalPayment)
                    else
                        goToStep(ProcessSwapStep.Processing)
                }
                setTimeout(() => {
                    setLoadingWizard(false)
                }, 500);
            }
            catch (e) {
                goToStep(ProcessSwapStep.Failed)
                toast.error(e.message)
                setTimeout(() => {
                    setLoadingWizard(false)
                }, 500);
            }

        })()
    }, [swapId, currentStep, router.query])

    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
            </div>
        </>
    )
}

export default OverviewStep;