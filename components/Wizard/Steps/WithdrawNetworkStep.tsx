import { DocumentDuplicateIcon, SwitchHorizontalIcon } from '@heroicons/react/outline';
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
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import ClickTooltip from '../../Tooltips/ClickTooltip';

const WithdrawNetworkStep: FC = () => {
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
        if (currentStep === "OffRampWithdrawal") {
            const authData = TokenService.getAuthData();
            if (!authData) {
                goToStep("Email")
                return;
            }
            const swap = await getSwap(swapId.toString())
            const swapStatus = swap?.data.status;
            if (swapStatus == SwapStatus.Completed)
                goToStep("Success")
            else if (swapStatus == SwapStatus.Failed)
                goToStep("Failed")
        }
    }, [currentStep], 10000)

    const handleConfirm = useCallback(async () => {
        setTransferDone(true)
    }, [])

    const network = data.networks?.find(n => n.code === swap?.data?.network)
    const network_name = network?.name || ' '
    const network_logo_url = network?.logo_url

    if (!swap?.data?.offramp_info)
    {
        return null;
    }

    return (
        <>
            <div className="w-full px-6 space-y-5 md:grid md:grid-flow-row text-pink-primary-300">
                <div className="flex items-center">
                    <h3 className="block text-lg font-medium text-white leading-6 text-left">
                        Go to
                        {
                            network_logo_url &&
                            <div className="inline-block ml-2 mr-1" style={{ position: "relative", top: '6px' }}>
                                <div className="flex-shrink-0 h-6 w-6 relative">
                                    <Image
                                        src={network_logo_url}
                                        alt="Network Logo"
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
                        <span className='strong-highlight'>
                            {network_name}
                        </span> and send {swap?.data.currency} to the provided L2 address
                    </h3>
                </div>
                <div className='mb-12'>
                    <label htmlFor="selectAs" className="block font-normal text-sm">
                        Select as "Where would you like to send your crypto to"
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            autoCorrect="off"
                            type="text"
                            name="selectAs"
                            id="selectAs"
                            disabled={true}
                            value={'     To Another Loopring L2 Account'}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                        <div className='absolute top-4 left-2.5'>
                            <SwitchHorizontalIcon className='h-4 w-4'/>
                        </div>
                    </div>
                    <label htmlFor="address" className="block font-normal text-sm">
                        Recipient
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
                            value={swap?.data.offramp_info.deposit_address}
                            disabled={true}
                            className="h-12 pb-1 pt-0 text-xs md:text-sm focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                        <div className='absolute inset-y-2 right-2.5'>
                            <ClickTooltip text='Copied!' moreClassNames='right-0 bottom-7'>
                                <div className='rounded bg bg-darkblue-50 p-1' onClick={() => copyTextToClipboard(swap?.data.offramp_info.deposit_address)}>
                                    <DocumentDuplicateIcon className='h-6 w-5' />
                                </div>
                            </ClickTooltip>
                        </div>
                    </div>
                    <label htmlFor="addressType" className="block font-normal text-sm">
                        Address Type
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            autoCorrect="off"
                            type="text"
                            name="addressType"
                            id="addressType"
                            disabled={true}
                            value={'EOA Wallet'}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                    </div>
                    {
                        swap?.data?.offramp_info?.memo &&
                        <>
                            <label htmlFor="memo" className="block font-normal text-sm">
                                Memo
                            </label>
                            <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                                <input
                                    inputMode="decimal"
                                    autoComplete="off"
                                    placeholder=""
                                    autoCorrect="off"
                                    type="text"
                                    name="memo"
                                    id="memo"
                                    disabled={true}
                                    value={swap?.data?.offramp_info?.memo}
                                    className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                                />
                                <div className='absolute inset-y-2 right-2.5'>
                                    <ClickTooltip text='Copied!' moreClassNames='right-0 bottom-7'>
                                        <div className='rounded bg bg-darkblue-50 p-1' onClick={() => copyTextToClipboard(swap?.data?.offramp_info?.memo)}>
                                            <DocumentDuplicateIcon className='h-6 w-5' />
                                        </div>
                                    </ClickTooltip>
                                </div>
                            </div>
                        </>
                    }

                    <label htmlFor="withdrawalAmount" className="block font-normal text-sm">
                        Amount
                    </label>
                    <div className="relative rounded-md shadow-sm mt-1 mb-5 md:mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder=""
                            autoCorrect="off"
                            type="text"
                            name="withdrawalAmount"
                            id="withdrawalAmount"
                            disabled={true}
                            value={swap?.data?.amount}
                            className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                        />
                        <div className='absolute inset-y-2 right-2.5'>
                            <ClickTooltip text='Copied!' moreClassNames='right-0 bottom-7'>
                                <div className='rounded bg bg-darkblue-50 p-1' onClick={() => copyTextToClipboard(swap?.data?.amount)}>
                                    <DocumentDuplicateIcon className='h-6 w-5' />
                                </div>
                            </ClickTooltip>
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
                                    className="h-12 pb-1 pt-0 focus:ring-pink-primary focus:border-pink-primary border-darkblue-100 pr-2 block
                            placeholder:text-pink-primary-300 placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                                />
                                <div className='absolute inset-y-2 right-2.5'>
                                    <ClickTooltip text='Copied!' moreClassNames='right-0 bottom-7'>
                                        <div className='rounded bg bg-darkblue-50 p-1' onClick={() => copyTextToClipboard(payment?.manual_flow_context?.note)}>
                                            <DocumentDuplicateIcon className='h-6 w-5' />
                                        </div>
                                    </ClickTooltip>
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
                                <label className="block text-lg font-lighter leading-6 text-pink-primary-300">Waiting for a transaction from the network</label>
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

export default WithdrawNetworkStep;