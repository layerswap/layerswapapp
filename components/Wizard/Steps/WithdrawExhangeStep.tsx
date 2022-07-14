import { CheckIcon, InformationCircleIcon } from '@heroicons/react/outline';
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
import { useSettingsState } from '../../../context/settings';
import Image from 'next/image'
import { Popover } from '@headlessui/react';
import AmountAndFeeDetails from '../../amountAndFeeDetailsComponent';
import { SwapFormValues } from '../../DTOs/SwapFormValues';
import ExchangeSettings from '../../../lib/ExchangeSettings';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/auth';

const WithdrawExchangeStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const { swap } = useSwapDataState()
    const { payment } = swap || {}
    const { currentStep } = useFormWizardState<SwapWizardSteps>()
    const { networks, exchanges } = useSettingsState()
    const { goToStep } = useFormWizardaUpdate<SwapWizardSteps>()
    const router = useRouter();
    const { swapId } = router.query;
    const { getSwap } = useSwapDataUpdate()
    const { boot, show, update } = useIntercom()
    const { email } = useAuthState()
    const updateWithProps = () => update({ email: email, customAttributes: {swapId: swapId} })

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
            else if (payment?.status == "completed")
                await goToStep("Processing")
            // else if (swapStatus == SwapStatus.Pending)
            //     await goToStep("Processing")
        }
    }, [currentStep], 10000)


    const handleConfirm = useCallback(async () => {
        setTransferDone(true)
    }, [])

    const contextFlow = payment?.external_flow_context || payment?.manual_flow_context
    const network_name = networks?.find(n => n.code === swap?.network)?.name || ' '
    const exchange = exchanges?.find(n => n.internal_name === payment?.exchange)
    const exchange_name = exchange?.name || ' '
    const exchange_id = exchange?.id
    const exchange_logo_url = exchange?.logo_url

    const handleCopyAddress = useCallback(() => {
        copyTextToClipboard(swap?.payment?.manual_flow_context?.address)
    }, [swap?.destination_address])

    const handleCopyAmount = useCallback(() => {
        copyTextToClipboard(swap?.amount)
    }, [swap?.amount])

    const handleCopyNote = useCallback(() => {
        copyTextToClipboard(payment?.manual_flow_context?.note)
    }, [payment?.manual_flow_context?.note])

    return (
        <>
            <div className="w-full px-6 py-6 space-y-5 md:grid md:grid-flow-row text-pink-primary-300">
                <div className="flex items-center">
                    <h3 className="block text-lg font-medium leading-6 text-left">
                        Go to
                        {
                            exchange_logo_url &&
                            <div className="inline-block mx-1" style={{ position: "relative", top: '6px' }}>
                                <div className="flex-shrink-0 h-6 w-6 relative">
                                    <Image
                                        src={exchange_logo_url}
                                        alt="Project Logo"
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
                <div className='mb-12'>
                    <label htmlFor="address" className="block font-normal text-sm">
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
                            value={swap?.payment?.manual_flow_context?.address}
                            disabled={true}
                            className="h-12 pb-1 pt-0 text-xs md:text-sm focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                        <div className='absolute inset-y-2 right-2.5'>
                            <Popover>
                                <Popover.Button>
                                    <div className=' rounded bg bg-darkblue-50 p-2' onClick={handleCopyAddress}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none">
                                            <path opacity="0.7" d="M10.3158 0H1.47368C0.663158 0 0 0.654545 0 1.45455V11.6364H1.47368V1.45455H10.3158V0ZM12.5263 2.90909H4.42105C3.61053 2.90909 2.94737 3.56364 2.94737 4.36364V14.5455C2.94737 15.3455 3.61053 16 4.42105 16H12.5263C13.3368 16 14 15.3455 14 14.5455V4.36364C14 3.56364 13.3368 2.90909 12.5263 2.90909ZM12.5263 14.5455H4.42105V4.36364H12.5263V14.5455Z" fill="#74AAC8" />
                                        </svg>
                                    </div>
                                </Popover.Button>
                                <Popover.Panel>
                                    <div className="ml-1 text-white">
                                        <div className="relative">
                                            <div className="w-14 absolute flex right-0.5 bottom-6 flex-col mb-3">
                                                <span className="leading-4 min z-10 p-2 text-xs text-center text-white whitespace-no-wrap bg-darkblue-300 shadow-lg rounded-md">
                                                    Copied!
                                                </span>
                                                <div className="absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-darkblue-100"></div>
                                            </div>
                                        </div>
                                    </div>
                                </Popover.Panel>
                            </Popover>
                        </div>
                    </div>
                    <label htmlFor="network" className="block font-normal text-sm">
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
                            value={payment?.manual_flow_context?.network_display_name}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                    </div>
                    <label htmlFor="withdrawlAmount" className="block font-normal text-sm">
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
                            value={swap?.amount}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                        <div className='absolute inset-y-2 right-2.5'>
                            <Popover>
                                <Popover.Button>
                                    <div className=' rounded bg bg-darkblue-50 p-2 right-2.5' onClick={handleCopyAmount}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none">
                                            <path opacity="0.7" d="M10.3158 0H1.47368C0.663158 0 0 0.654545 0 1.45455V11.6364H1.47368V1.45455H10.3158V0ZM12.5263 2.90909H4.42105C3.61053 2.90909 2.94737 3.56364 2.94737 4.36364V14.5455C2.94737 15.3455 3.61053 16 4.42105 16H12.5263C13.3368 16 14 15.3455 14 14.5455V4.36364C14 3.56364 13.3368 2.90909 12.5263 2.90909ZM12.5263 14.5455H4.42105V4.36364H12.5263V14.5455Z" fill="#74AAC8" />
                                        </svg>
                                    </div>
                                </Popover.Button>
                                <Popover.Panel>
                                    <div className="ml-1 text-white">
                                        <div className="relative">
                                            <div className="w-14 absolute flex right-0.5 bottom-6 flex-col mb-3">
                                                <span className="leading-4 min z-10 p-2 text-xs text-center text-white whitespace-no-wrap bg-darkblue-300 shadow-lg rounded-md">
                                                    Copied!
                                                </span>
                                                <div className="absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-darkblue-100"></div>
                                            </div>
                                        </div>
                                    </div>
                                </Popover.Panel>
                            </Popover>
                        </div>
                    </div>

                    {
                        payment?.manual_flow_context?.require_note &&
                        <>
                            <label htmlFor="payment_note" className="block font-normal text-sm">
                                Remarks
                            </label>
                            <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                                <input
                                    inputMode="decimal"
                                    autoComplete="off"
                                    placeholder=""
                                    autoCorrect="off"
                                    type="text"
                                    name="payment_note"
                                    id="payment_note"
                                    disabled={true}
                                    value={payment?.manual_flow_context?.note}
                                    className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-36 block
                                        placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                                />
                                <div className='absolute inset-y-2 right-2.5'>
                                    <Popover>
                                        <Popover.Button>
                                            <div className=' rounded bg bg-darkblue-50 p-2 right-2.5' onClick={handleCopyNote}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none">
                                                    <path opacity="0.7" d="M10.3158 0H1.47368C0.663158 0 0 0.654545 0 1.45455V11.6364H1.47368V1.45455H10.3158V0ZM12.5263 2.90909H4.42105C3.61053 2.90909 2.94737 3.56364 2.94737 4.36364V14.5455C2.94737 15.3455 3.61053 16 4.42105 16H12.5263C13.3368 16 14 15.3455 14 14.5455V4.36364C14 3.56364 13.3368 2.90909 12.5263 2.90909ZM12.5263 14.5455H4.42105V4.36364H12.5263V14.5455Z" fill="#74AAC8" />
                                                </svg>
                                            </div>
                                        </Popover.Button>
                                        <Popover.Panel>
                                            <div className="ml-1 text-white">
                                                <div className="relative">
                                                    <div className="w-14 absolute flex right-0.5 bottom-6 flex-col mb-3">
                                                        <span className="leading-4 min z-10 p-2 text-xs text-center text-white whitespace-no-wrap bg-darkblue-300 shadow-lg rounded-md">
                                                            Copied!
                                                        </span>
                                                        <div className="absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-darkblue-100"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Popover.Panel>
                                    </Popover>
                                </div>
                            </div>
                            <div className='flex-col w-full rounded-md bg-yellow-400 shadow-lg p-2'>
                                <div className='flex items-center'>
                                    <div className='mr-2 p-2 rounded-lg bg-yellow-500'>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <p className='font-normal text-sm text-darkblue-600'>
                                        Please include the "Remarks" field - it identifies the transfer with your account and is required for a successful deposit.
                                    </p>
                                </div>
                            </div>
                        </>

                    }

                    {/* <div className="w-full">
                        <AmountAndFeeDetails swapFormData={swapFormData} />
                    </div> */}
                </div>
                {
                    transferDone ?
                        <div>
                            <div className='flex place-content-center mb-16 md:mb-8'>
                                <div className='relative'>
                                    <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
                                    <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
                                    <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-pink-primary-800 rounded-full'></div>
                                </div>
                            </div>
                            <div className="flex text-center place-content-center mt-1 md:mt-1">
                                <label className="block text-lg font-lighter leading-6 text-pink-primary-300">Waiting for Exchange transaction.</label>
                            </div>
                        </div>

                        :
                        <div className="text-white text-base">
                            <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={handleConfirm} >
                                I Did The Transfer
                            </SubmitButton>
                            {/* <div className='flex place-content-center items-center mt-8'>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 fill-pink-primary" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M17.5006 3.16667C16.5756 2.875 15.559 2.75 14.584 2.75C12.959 2.75 11.209 3.08333 10.0007 4C8.79232 3.08333 7.04232 2.75 5.41732 2.75C3.79232 2.75 2.04232 3.08333 0.833984 4V16.2083C0.833984 16.4167 1.04232 16.625 1.25065 16.625C1.33398 16.625 1.37565 16.5833 1.45898 16.5833C2.58398 16.0417 4.20898 15.6667 5.41732 15.6667C7.04232 15.6667 8.79232 16 10.0007 16.9167C11.1257 16.2083 13.1673 15.6667 14.584 15.6667C15.959 15.6667 17.3757 15.9167 18.5423 16.5417C18.6256 16.5833 18.6673 16.5833 18.7506 16.5833C18.959 16.5833 19.1673 16.375 19.1673 16.1667V4C18.6673 3.625 18.1256 3.375 17.5006 3.16667ZM17.5006 14.4167C16.584 14.125 15.584 14 14.584 14C13.1673 14 11.1257 14.5417 10.0007 15.25V5.66667C11.1257 4.95833 13.1673 4.41667 14.584 4.41667C15.584 4.41667 16.584 4.54167 17.5006 4.83333V14.4167Z" fill="#4771FF" />
                                </svg>
                                <Link key="userGuide" href="/userguide"><a className="text-darkblue text-base font-semibold hover:cursor-pointer">Read User Guide</a></Link>
                            </div> */}
                        </div>
                }
                <div className="text-white flex justify-center text-sm">
                    <button onClick={() => {
                        boot();
                        show();
                        updateWithProps()
                        }} 
                        className="group disabled:text-pink-primary-600 text-pink-primary relative flex justify-center px-4 border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                        Need Help?
                    </button>
                </div>
            </div>

        </>
    )
}

export default WithdrawExchangeStep;