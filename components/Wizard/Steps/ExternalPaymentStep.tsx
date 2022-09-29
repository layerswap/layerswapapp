import { FC, useCallback } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton from '../../buttons/submitButton';
import { useInterval } from '../../../hooks/useInterval';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { SwapWizardSteps } from '../../../Models/Wizard';
import TokenService from '../../../lib/TokenService';
import { useRouter } from 'next/router';
import { SwapStatus } from '../../../Models/SwapStatus';
import { useSettingsState } from '../../../context/settings';

const ExternalPaumentStep: FC = () => {

    const { swap } = useSwapDataState()
    const { payment } = swap?.data || {}
    const { currentStep } = useFormWizardState<SwapWizardSteps>()
    const settings = useSettingsState();
    const { goToStep } = useFormWizardaUpdate<SwapWizardSteps>()
    const router = useRouter();
    const { swapId } = router.query;
    const { getSwap } = useSwapDataUpdate()
    const exchange = settings.data.exchanges.find(x => x.internal_name == payment?.exchange);

    useInterval(async () => {
        if (currentStep === "ExternalPayment") {
            const authData = TokenService.getAuthData();
            if (!authData) {
                goToStep("Email")
                return;
            }
            const swap = await getSwap(swapId.toString())
            const { payment } = swap?.data || {}
            const swapStatus = swap?.data?.status;
            const paymentStatus = payment?.status
            if (swapStatus == SwapStatus.Completed)
                goToStep("Success")
            else if (swapStatus == SwapStatus.Failed || paymentStatus == 'closed')
                goToStep("Failed")
        }
    }, [currentStep, swapId], 10000)


    const handleContinue = useCallback(async () => {
        const access_token = TokenService.getAuthData()?.access_token
        if (!access_token)
            goToStep("Email")
        const swap = await getSwap(swapId.toString())
        const { payment } = swap?.data || {}
        //TODO handle no payment url
        const { payment_url } = payment.external_flow_context || {}
        window.open(payment_url, '_blank', 'width=420,height=720')
    }, [])

    return (
        <>
            <div className="w-full px-6 md:px-8 flex justify-between h-full flex-col">
                <div className=' space-y-10'>
                    <div className="flex items-center">
                        <label className="block text-lg font-medium text-white">Complete {exchange?.name} transfer</label>
                    </div>
                    <div className="rounded-md border bg-darkblue-700 w-full grid grid-flow-row p-5 border-darkblue-500">
                        <ul className='list-disc my-2 pl-5 text-primary-text'>
                            <li>
                                By clicking Continue you will be redirected to {exchange?.name} to authorize and pay.
                            </li>
                            <li>
                                This page will automatically update after you complete the payment in {exchange?.name}.
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="text-white">
                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleContinue}>
                        Continue to {exchange?.name}
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default ExternalPaumentStep;