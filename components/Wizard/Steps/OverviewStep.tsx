import { ExclamationIcon } from '@heroicons/react/solid';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import TokenService from '../../../lib/TokenService';
import { SwapStatus } from '../../../Models/SwapStatus';
import { SwapWizardSteps } from '../../../Models/Wizard';

type Props = {
    current: boolean
}

const OverviewStep: FC<Props> = ({ current }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const { swap } = useSwapDataState()
    const { setLoading: setLoadingWizard, goToStep } = useFormWizardaUpdate<SwapWizardSteps>()
    const { currentStep } = useFormWizardState<SwapWizardSteps>()

    const router = useRouter();
    const { swapId } = router.query;

    const { getSwap } = useSwapDataUpdate()

    const { payment } = swap || {}
    useEffect(() => {
        (async () => {
            try {
                if (currentStep == "Overview") {
                    const authData = TokenService.getAuthData();
                    if (!authData) {
                        await goToStep("Email")
                        setLoadingWizard(false)
                        return;
                    }
                    const swap = await getSwap(swapId.toString())
                    const { payment } = swap || {};
                    const swapStatus = swap?.status;
                    const paymentStatus = payment?.status
                    if (swapStatus == SwapStatus.Completed)
                        await goToStep("Success")
                    else if (swapStatus == SwapStatus.Failed || paymentStatus == 'closed')
                        await goToStep("Failed")
                    else if (swapStatus == SwapStatus.Pending)
                        await goToStep("Processing")
                    else {
                        if (payment.external_flow_context)
                            goToStep("ExternalPayment")
                        else if (payment.manual_flow_context)
                            goToStep("Withdrawal")
                        else
                            goToStep("Processing")
                    }
                    setTimeout(() => {
                        setLoadingWizard(false)
                    }, 500);
                }
            }
            catch (e) {
                await goToStep("Failed")
                setTimeout(() => {
                    setLoadingWizard(false)
                }, 500);
            }

        })()
    }, [swapId, currentStep])

    const handleConfirm = useCallback(async () => {
        try {
            if (payment.external_flow_context)
                goToStep("ExternalPayment")
            else if (payment.manual_flow_context)
                goToStep("Withdrawal")
            else
                goToStep("Processing")
        }
        catch (e) {
            if (e?.response?.status === 404)
                toast.error("Swap not found")
            toast.error(e.message)
            setTimeout(() => {
                setLoadingWizard(false)
            }, 500);
        }
        finally {
        }
    }, [payment])

    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
                {
                    error &&
                    <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-pink-primary-300">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                }
            </div>
        </>
    )
}

export default OverviewStep;