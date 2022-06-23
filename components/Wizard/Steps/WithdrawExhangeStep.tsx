import { CheckIcon } from '@heroicons/react/outline';
import { FC, useCallback, useEffect, useState } from 'react'
import Link from 'next/link';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useWizardState, WizardPartType } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';
import { useInterval } from '../../../hooks/useInyterval';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { SwapWizardSteps } from '../../../Models/Wizard';
import TokenService from '../../../lib/TokenService';
import { useRouter } from 'next/router';
import { SwapStatus } from '../../../Models/SwapStatus';
import { copyTextToClipboard } from '../../../lib/copyToClipboard';

const WithdrawExchangeStep: FC = () => {

    const { swap } = useSwapDataState()
    const { payment } = swap || {}
    const { currentStep } = useFormWizardState<SwapWizardSteps>()

    const { goToStep } = useFormWizardaUpdate<SwapWizardSteps>()
    const router = useRouter();
    const { swapId } = router.query;
    const { getSwap } = useSwapDataUpdate()

    useInterval(async () => {
        if (currentStep === "Withdrawal") {
            const authData = TokenService.getAuthData();
            if (!authData) {
                await goToStep("Email")
                return;
            }
            const swap = await getSwap(swapId.toString())
            const { payment } = swap || {}
            const swapStatus = swap?.status;
            const paymentStatus = payment?.status
            if (swapStatus == SwapStatus.Completed)
                await goToStep("Success")
            else if (swapStatus == SwapStatus.Failed || paymentStatus == 'closed')
                await goToStep("Failed")
            // else if (swapStatus == SwapStatus.Pending)
            //     await goToStep("Processing")
        }
    }, [currentStep, swapId], 2000)


    const handleConfirm = useCallback(async () => {
        goToStep("Processing")
    }, [])

    const contextFlow = payment?.external_flow_context || payment?.manual_flow_context || payment?.note_flow_context

    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
                <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row p-5 border-darkblue-100 mb-11">
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <label className="block text-lg font-medium leading-6 text-white"> What to do now? </label>
                    </div>
                    <div className="flex items-center mt-1">
                        <label className="block text-lg font-lighter leading-6 text-white"> Go to <span className='font-medium underline'>Binance</span> and do a withdrawal to the provided address. </label>
                    </div>
                </div>
                <div className='mb-12'>
                    <label htmlFor="address" className="block font-normal text-light-blue text-sm">
                        Address
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder=""
                            autoCorrect="off"
                            type="text"
                            name="address"
                            id="address"
                            value={swap?.destination_address}
                            disabled={true}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                            placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                        <button className='absolute rounded bg bg-darkblue-50 p-2 inset-y-2 right-2.5' onClick={() => { copyTextToClipboard(swap?.destination_address) }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none">
                                <path opacity="0.7" d="M10.3158 0H1.47368C0.663158 0 0 0.654545 0 1.45455V11.6364H1.47368V1.45455H10.3158V0ZM12.5263 2.90909H4.42105C3.61053 2.90909 2.94737 3.56364 2.94737 4.36364V14.5455C2.94737 15.3455 3.61053 16 4.42105 16H12.5263C13.3368 16 14 15.3455 14 14.5455V4.36364C14 3.56364 13.3368 2.90909 12.5263 2.90909ZM12.5263 14.5455H4.42105V4.36364H12.5263V14.5455Z" fill="#74AAC8" />
                            </svg>
                        </button>
                    </div>
                    <label htmlFor="network" className="block font-normal text-light-blue text-sm">
                        Network
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder=""
                            autoCorrect="off"
                            type="text"
                            name="network"
                            id="network"
                            disabled={true}
                            value={swap?.network}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                            placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                    </div>
                    <label htmlFor="withdrawlAmount" className="block font-normal text-light-blue text-sm">
                        Withdrawl amount in {swap?.currency}
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder=""
                            autoCorrect="off"
                            type="text"
                            name="withdrawlAmount"
                            id="withdrawlAmount"
                            disabled={true}
                            value={payment?.manual_flow_context?.total_withdrawal_amount || payment?.amount}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                            placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                        <button className='absolute rounded bg bg-darkblue-50 p-2 inset-y-2 right-2.5' onClick={() => { copyTextToClipboard(payment?.manual_flow_context?.total_withdrawal_amount || payment?.amount) }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none">
                                <path opacity="0.7" d="M10.3158 0H1.47368C0.663158 0 0 0.654545 0 1.45455V11.6364H1.47368V1.45455H10.3158V0ZM12.5263 2.90909H4.42105C3.61053 2.90909 2.94737 3.56364 2.94737 4.36364V14.5455C2.94737 15.3455 3.61053 16 4.42105 16H12.5263C13.3368 16 14 15.3455 14 14.5455V4.36364C14 3.56364 13.3368 2.90909 12.5263 2.90909ZM12.5263 14.5455H4.42105V4.36364H12.5263V14.5455Z" fill="#74AAC8" />
                            </svg>
                        </button>
                    </div>
                    {
                        payment?.note_flow_context?.note &&
                        <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                            <input
                                inputMode="decimal"
                                autoComplete="off"
                                placeholder=""
                                autoCorrect="off"
                                type="text"
                                name="remark"
                                id="remark"
                                disabled={true}
                                value={payment?.note_flow_context?.note}
                                className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                            placeholder:text-light-blue placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                            />
                            <button className='absolute rounded bg bg-darkblue-50 p-2 inset-y-2 right-2.5' onClick={() => { copyTextToClipboard(payment?.note_flow_context?.note) }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none">
                                    <path opacity="0.7" d="M10.3158 0H1.47368C0.663158 0 0 0.654545 0 1.45455V11.6364H1.47368V1.45455H10.3158V0ZM12.5263 2.90909H4.42105C3.61053 2.90909 2.94737 3.56364 2.94737 4.36364V14.5455C2.94737 15.3455 3.61053 16 4.42105 16H12.5263C13.3368 16 14 15.3455 14 14.5455V4.36364C14 3.56364 13.3368 2.90909 12.5263 2.90909ZM12.5263 14.5455H4.42105V4.36364H12.5263V14.5455Z" fill="#74AAC8" />
                                </svg>
                            </button>
                        </div>
                    }

                    <div className='mt-1 md:mt-7 block text-base font-lighter leading-6 text-white'>
                        <ul className='list-disc ml-5'>
                            {
                                payment?.manual_flow_context?.is_fee_refundable &&
                                <li>
                                    Transaction fee <strong>({payment?.manual_flow_context?.withdrawal_fee} {swap?.currency})</strong> will be refunded to your exchange account.
                                </li>
                            }
                            <li>
                                Make sure that <strong>Receive amount</strong> is precisely <strong>{payment?.manual_flow_context?.total_withdrawal_amount || payment?.amount} {swap?.currency}</strong>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="text-white text-lg ">
                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={handleConfirm}>
                        I Did The Transfer
                    </SubmitButton>
                    <div className='flex place-content-center items-center mt-8'>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 fill-pink-primary" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M17.5006 3.16667C16.5756 2.875 15.559 2.75 14.584 2.75C12.959 2.75 11.209 3.08333 10.0007 4C8.79232 3.08333 7.04232 2.75 5.41732 2.75C3.79232 2.75 2.04232 3.08333 0.833984 4V16.2083C0.833984 16.4167 1.04232 16.625 1.25065 16.625C1.33398 16.625 1.37565 16.5833 1.45898 16.5833C2.58398 16.0417 4.20898 15.6667 5.41732 15.6667C7.04232 15.6667 8.79232 16 10.0007 16.9167C11.1257 16.2083 13.1673 15.6667 14.584 15.6667C15.959 15.6667 17.3757 15.9167 18.5423 16.5417C18.6256 16.5833 18.6673 16.5833 18.7506 16.5833C18.959 16.5833 19.1673 16.375 19.1673 16.1667V4C18.6673 3.625 18.1256 3.375 17.5006 3.16667ZM17.5006 14.4167C16.584 14.125 15.584 14 14.584 14C13.1673 14 11.1257 14.5417 10.0007 15.25V5.66667C11.1257 4.95833 13.1673 4.41667 14.584 4.41667C15.584 4.41667 16.584 4.54167 17.5006 4.83333V14.4167Z" fill="#4771FF" />
                        </svg>
                        <Link key="userGuide" href="/userguide"><a className="text-darkblue text-base font-semibold hover:cursor-pointer">Read User Guide</a></Link>
                    </div>
                </div>
            </div>

        </>
    )
}

export default WithdrawExchangeStep;