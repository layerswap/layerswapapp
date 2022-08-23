import { DocumentDuplicateIcon } from '@heroicons/react/outline';
import { FC, useCallback, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton from '../../buttons/submitButton';
import { useInterval } from '../../../hooks/useInterval';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { SwapWizardSteps } from '../../../Models/Wizard';
import TokenService from '../../../lib/TokenService';
import { useRouter } from 'next/router';
import { SwapStatus } from '../../../Models/SwapStatus';
import { copyTextToClipboard } from '../../utils/copyToClipboard';
import { useSettingsState } from '../../../context/settings';
import Image from 'next/image'
import ExchangeSettings from '../../../lib/ExchangeSettings';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import ClickTooltip from '../../Tooltips/ClickTooltip';

const WithdrawExchangeStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const { swap } = useSwapDataState()
    const { payment } = swap?.data || {}
    const { currentStep } = useFormWizardState<SwapWizardSteps>()
    const { data } = useSettingsState()
    const { goToStep } = useFormWizardaUpdate<SwapWizardSteps>()
    const router = useRouter();
    const { swapId } = router.query;
    const { getSwap } = useSwapDataUpdate()
    const { email } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, customAttributes: { paymentId: swap?.data?.payment?.id } })

    useInterval(async () => {
        if (currentStep === "Withdrawal") {
            const authData = TokenService.getAuthData();
            if (!authData) {
                goToStep("Email")
                return;
            }
            const swap = await getSwap(swapId.toString())
            const { payment } = swap?.data || {}
            const swapStatus = swap?.data.status;
            const paymentStatus = payment?.status
            if (swapStatus == SwapStatus.Completed)
                goToStep("Success")
            else if (swapStatus == SwapStatus.Failed || paymentStatus == 'closed')
                goToStep("Failed")
            else if (payment?.status == "completed")
                goToStep("Processing")
            // else if (swapStatus == SwapStatus.Pending)
            //     await goToStep("Processing")
        }
    }, [currentStep], 10000)


    const handleConfirm = useCallback(async () => {
        setTransferDone(true)
    }, [])

    const exchange = data.exchanges?.find(n => n.internal_name === payment?.exchange)
    const exchange_name = exchange?.name || ' '
    const exchange_id = exchange?.id
    const exchange_logo_url = exchange?.logo_url

    return (
        <>
            <div className="w-full px-8 space-y-5 md:grid md:grid-flow-row text-pink-primary-300">
                <div className="flex items-center">
                    <h3 className="block text-lg font-medium text-white leading-6 text-left">
                        Go to
                        {
                            exchange_logo_url &&
                            <div className="inline-block ml-2 mr-1" style={{ position: "relative", top: '6px' }}>
                                <div className="flex-shrink-0 h-6 w-6 relative">
                                    <Image
                                        src={exchange_logo_url}
                                        alt="Exchange Logo"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        priority
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                    />
                                </div>
                            </div>
                        }
                        <span className='strong-highlight mr-1'>
                            {exchange_name}
                        </span> and do a withdrawal to the provided address.
                    </h3>
                </div>
                {
                    ExchangeSettings.KnownSettings[exchange_id]?.WithdrawalWarningMessage &&
                    <div className='flex-col w-full rounded-md bg-pink-700 shadow-lg p-2'>
                        <div className='flex items-center'>
                            <div className='mr-2 p-2 rounded-lg bg-pink-600'>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className='font-normal text-sm text-white'>
                                {ExchangeSettings.KnownSettings[exchange_id]?.WithdrawalWarningMessage}
                            </p>
                        </div>
                    </div>
                }
                <div className='mb-12 grid grid-cols-1 gap-5'>
                    <div>
                        <p className="block font-normal text-sm">
                            Address
                        </p>
                        <div className="relative break-all rounded-md items-center pl-3 pr-11 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                            <p>
                                {swap?.data?.payment?.manual_flow_context?.address}
                            </p>
                            <div className='absolute inset-y-2 right-2.5 md:top-2 top-5'>
                                <ClickTooltip text='Copied!' moreClassNames='right-0 bottom-7'>
                                    <div className='rounded bg bg-darkblue-50 p-1' onClick={() => copyTextToClipboard(swap?.data.offramp_info.deposit_address)}>
                                        <DocumentDuplicateIcon className='h-6 w-5' />
                                    </div>
                                </ClickTooltip>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="block font-normal text-sm">
                            Network
                        </p>
                        <div className="relative rounded-md px-3 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                            <p>
                                {payment?.manual_flow_context?.network_display_name}
                            </p>
                        </div>
                    </div>
                    <div className='flex space-x-5'>
                        <div className='w-full'>
                            <p className="block font-normal text-sm">
                                Amount
                            </p>
                            <div className="relative rounded-md px-3 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                                <p>
                                    {swap?.data?.amount}
                                </p>
                                <div className='absolute inset-y-2 right-2.5'>
                                    <ClickTooltip text='Copied!' moreClassNames='right-0 bottom-7'>
                                        <div className='rounded bg bg-darkblue-50 p-1' onClick={() => copyTextToClipboard(swap?.data?.amount)}>
                                            <DocumentDuplicateIcon className='h-6 w-5' />
                                        </div>
                                    </ClickTooltip>
                                </div>
                            </div>
                        </div>
                        <div className='w-full'>
                            <p className="block font-normal text-sm">
                                Asset
                            </p>
                            <div className="relative rounded-md px-3 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                                <p>
                                    {swap?.data?.currency}
                                </p>
                            </div>
                        </div>
                    </div>
                    {
                        payment?.manual_flow_context?.require_note &&
                        <>
                            <div>
                                <p className="block font-normal text-sm">
                                    Remarks
                                </p>
                                <div className="relative rounded-md px-3 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                                    <p>
                                        {payment?.manual_flow_context?.note}
                                    </p>
                                    <div className='absolute inset-y-2 right-2.5'>
                                        <ClickTooltip text='Copied!' moreClassNames='right-0 bottom-7'>
                                            <div className='rounded bg bg-darkblue-50 p-1' onClick={() => copyTextToClipboard(payment?.manual_flow_context?.note)}>
                                                <DocumentDuplicateIcon className='h-6 w-5' />
                                            </div>
                                        </ClickTooltip>
                                    </div>
                                </div>
                            </div>
                            <div className='flex-col w-full rounded-md bg-yellow-400 shadow-lg p-2'>
                                <div className='flex items-center'>
                                    <div className='mr-2 p-2 rounded-lg bg-yellow-500'>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className='font-normal text-sm text-darkblue-600'>
                                            - Please include the "Remarks" field - it is required for a successful deposit.
                                        </p>
                                        <p className='font-normal text-sm text-darkblue-600'>
                                            - Please make sure the "Internal transfer" checkbox is checked.
                                        </p>
                                    </div>

                                </div>
                            </div>
                        </>
                    }
                </div>
                {
                    transferDone ?
                        <div>
                            <div className='flex place-content-center mb-16 mt-3 md:mb-8'>
                                <div className='relative'>
                                    <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
                                    <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
                                    <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-pink-primary-800 rounded-full'></div>
                                </div>
                            </div>
                            <div className="flex text-center place-content-center mt-1 md:mt-1">
                                <label className="block text-lg font-lighter leading-6 text-pink-primary-300">Waiting for a transaction from the exchange</label>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    boot();
                                    show();
                                    updateWithProps()
                                }}
                                className="mt-3 text-center w-full disabled:text-pink-primary-600 text-pink-primary relative flex justify-center border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
                            >
                                Need help?
                            </button>
                        </div>

                        :
                        <div className="text-white text-base">
                            <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={handleConfirm} >
                                I Did The Transfer
                            </SubmitButton>
                        </div>
                }
            </div>

        </>
    )
}

export default WithdrawExchangeStep;