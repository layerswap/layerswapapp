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

    if (!swap?.data?.offramp_info) {
        return null;
    }

    return (
        <>
            <div className="w-full px-8 space-y-5 md:grid md:grid-flow-row text-pink-primary-300">
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
                <div className='mb-12 grid grid-cols-1 gap-5'>
                    {
                        network_name.toLowerCase() === 'loopring' &&
                        <div>
                            <p className="block font-normal text-sm">
                                Select as "Where would you like to send your crypto to"
                            </p>
                            <div className="flex rounded-md items-center px-3 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                                <SwitchHorizontalIcon className='h-4 w-4' />
                                <p className="ml-2">
                                    To Another Loopring L2 Account
                                </p>
                            </div>
                        </div>
                    }
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
                    <div>
                        <p className="block font-normal text-sm">
                            Recipient
                        </p>
                        <div className="relative break-all rounded-md items-center pl-3 pr-11 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                            <p>
                                {swap?.data.offramp_info.deposit_address}
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
                            Address Type
                        </p>
                        <div className="rounded-md items-center px-3 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                            <p>
                                EOA Wallet
                            </p>
                        </div>
                    </div>
                    {
                        swap?.data?.offramp_info?.memo &&
                        <div>
                            <p className="block font-normal text-sm">
                                Memo
                            </p>
                            <div className="relative rounded-md break-all pl-3 pr-11 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                                <p>
                                    {swap?.data?.offramp_info?.memo}
                                </p>
                                <div className='absolute inset-y-2 right-2.5'>
                                    <ClickTooltip text='Copied!' moreClassNames='right-0 bottom-7'>
                                        <div className='rounded bg bg-darkblue-50 p-1' onClick={() => copyTextToClipboard(swap?.data?.offramp_info?.memo)}>
                                            <DocumentDuplicateIcon className='h-6 w-5' />
                                        </div>
                                    </ClickTooltip>
                                </div>
                            </div>
                        </div>
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