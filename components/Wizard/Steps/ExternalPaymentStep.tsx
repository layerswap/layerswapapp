import { FC, useCallback } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton from '../../buttons/submitButton';
import { useInterval } from '../../../hooks/useInterval';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { SwapWizardSteps } from '../../../Models/Wizard';
import TokenService from '../../../lib/TokenService';
import { useRouter } from 'next/router';
import { SwapStatus } from '../../../Models/SwapStatus';

const ExternalPaumentStep: FC = () => {

    const { swap } = useSwapDataState()
    const { payment } = swap?.data || {}
    const { currentStep } = useFormWizardState<SwapWizardSteps>()

    const { goToStep } = useFormWizardaUpdate<SwapWizardSteps>()
    const router = useRouter();
    const { swapId } = router.query;
    const { getSwap } = useSwapDataUpdate()

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
            // else if (swapStatus == SwapStatus.Pending)
            //     await goToStep("Processing")
        }
    }, [currentStep, swapId], 10000)


    const handleContinue = useCallback(async () => {
        const access_token = TokenService.getAuthData()?.access_token
        if (!access_token)
            goToStep("Email")
        const swap = await getSwap(swapId.toString())
        const { payment } = swap?.data ||{}
        //TODO handle no payment url
        const { payment_url } = payment.external_flow_context || {}
        window.open(payment_url, '_blank', 'width=420,height=720')
    }, [])

    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
                <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row p-5 border-darkblue-100 mb-11">
                    <div className="flex items-center">
                        <label className="block text-lg font-medium leading-6 text-white"> Go to {payment?.exchange} to complete the payment </label>
                    </div>
                    <ul className='list-disc mt-10 pl-5'>
                        <li>
                            By clicking Continue you will be directed to {payment?.exchange} to authorize and pay.
                        </li>
                        <li>
                            This page will automatically update after you complete the payment in {payment?.exchange}.
                        </li>
                    </ul>
                </div>
                <div className="text-white text-lg ">
                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={handleContinue}>
                        Continue to {payment?.exchange}
                    </SubmitButton>
                    {/* <div className='flex place-content-center items-center mt-8'>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 fill-primary" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M17.5006 3.16667C16.5756 2.875 15.559 2.75 14.584 2.75C12.959 2.75 11.209 3.08333 10.0007 4C8.79232 3.08333 7.04232 2.75 5.41732 2.75C3.79232 2.75 2.04232 3.08333 0.833984 4V16.2083C0.833984 16.4167 1.04232 16.625 1.25065 16.625C1.33398 16.625 1.37565 16.5833 1.45898 16.5833C2.58398 16.0417 4.20898 15.6667 5.41732 15.6667C7.04232 15.6667 8.79232 16 10.0007 16.9167C11.1257 16.2083 13.1673 15.6667 14.584 15.6667C15.959 15.6667 17.3757 15.9167 18.5423 16.5417C18.6256 16.5833 18.6673 16.5833 18.7506 16.5833C18.959 16.5833 19.1673 16.375 19.1673 16.1667V4C18.6673 3.625 18.1256 3.375 17.5006 3.16667ZM17.5006 14.4167C16.584 14.125 15.584 14 14.584 14C13.1673 14 11.1257 14.5417 10.0007 15.25V5.66667C11.1257 4.95833 13.1673 4.41667 14.584 4.41667C15.584 4.41667 16.584 4.54167 17.5006 4.83333V14.4167Z" fill="#4771FF" />
                        </svg>
                        <Link key="userGuide" href="/userguide"><a className="text-darkblue text-base font-semibold hover:cursor-pointer">Read User Guide</a></Link>
                    </div> */}
                </div>
            </div>
        </>
    )
}

export default ExternalPaumentStep;