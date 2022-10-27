import { SwitchHorizontalIcon } from '@heroicons/react/outline';
import { CheckIcon, HomeIcon, ChatIcon } from '@heroicons/react/solid';

import { FC, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton from '../../buttons/submitButton';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { SwapWithdrawalStep, SwapWizardSteps } from '../../../Models/Wizard';
import { useRouter } from 'next/router';
import { useSettingsState } from '../../../context/settings';
import Image from 'next/image'
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import BackgroundField from '../../backgroundField';
import WarningMessage from '../../WarningMessage';
import NetworkSettings from '../../../lib/NetworkSettings';
import SlideOver from '../../SlideOver';
import { DocIframe } from '../../docInIframe';
import KnownInternalNames from '../../../lib/knownIds';
import { GetSwapStatusStep } from '../../utils/SwapStatus';
import { useEffectOnce } from 'react-use';
import GoHomeButton from '../../utils/GoHome';

const WithdrawNetworkStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const { data } = useSettingsState()
    const { networks, discovery: { resource_storage_url } } = data
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const router = useRouter();
    const { email } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, customAttributes: { swapId: swap?.data?.id } })
    const { swap } = useSwapDataState()
    const { setInterval } = useSwapDataUpdate()

    useEffectOnce(() => {
        setInterval(2000)
        return () => setInterval(0)
    })

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swapStatusStep !== SwapWithdrawalStep.OffRampWithdrawal)
            goToStep(swapStatusStep)
    }, [swapStatusStep])

    const handleConfirm = useCallback(async () => {
        setTransferDone(true)
    }, [])

    const network = networks?.find(n => n.currencies.some(nc => nc.id === swap?.data?.network_currency_id))
    const currency = network?.currencies.find(n => n.id === swap?.data?.network_currency_id)

    const network_name = network?.display_name || ' '
    const network_logo_url = network?.logo
    const network_internal_name = network?.internal_name

    if (!swap?.data?.additonal_data) {
        return null;
    }

    const userGuideUrlForDesktop = NetworkSettings.KnownSettings[network?.internal_name]?.UserGuideUrlForDesktop
    const userGuideUrlForMobile = NetworkSettings.KnownSettings[network?.internal_name]?.UserGuideUrlForMobile

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium text-white leading-6 text-left">
                            Send {currency?.asset} to the provided address in
                            {
                                network_logo_url && resource_storage_url &&
                                <div className="inline-block ml-2 mr-1" style={{ position: "relative", top: '6px' }}>
                                    <div className="flex-shrink-0 h-6 w-6 relative">
                                        <Image
                                            src={`${resource_storage_url}${network_logo_url}`}
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
                            {network_name}
                        </h3>
                    </div>
                    <div className='md:flex items-center md:space-x-2 space-y-1 md:space-y-0'>
                        <div className='flex-none'>
                            Guide for:
                        </div>
                        <div className='flex w-full text-white space-x-2'>
                            {
                                userGuideUrlForDesktop && renderGuideButton(userGuideUrlForDesktop, 'Loopring Web')
                            }
                            {
                                userGuideUrlForMobile && renderGuideButton(userGuideUrlForMobile, 'Loopring Mobile')
                            }
                        </div>
                    </div>

                    <div className='mb-6 grid grid-cols-1 gap-4'>
                        {
                            network_internal_name === KnownInternalNames.Networks.LoopringMainnet &&
                            <BackgroundField header={'Select as "Where would you like to send your crypto to"'}>
                                <div className='flex items-center space-x-2'>
                                    <SwitchHorizontalIcon className='h-4 w-4' />
                                    <p>
                                        To Another Loopring L2 Account
                                    </p>
                                </div>
                            </BackgroundField>
                        }
                        <div className='flex space-x-4'>
                            <BackgroundField isCopiable={true} toCopy={swap?.data?.requested_amount} header={'Amount'}>
                                <p>
                                    {swap?.data?.requested_amount}
                                </p>
                            </BackgroundField>
                            <BackgroundField header={'Asset'}>
                                <p>
                                    {currency?.asset}
                                </p>
                            </BackgroundField>
                        </div>
                        <BackgroundField isCopiable={true} isQRable={true} toCopy={swap?.data?.additonal_data?.deposit_address} header={'Recipient'}>
                            <p className='break-all'>
                                {swap?.data?.additonal_data?.deposit_address}
                            </p>
                        </BackgroundField>
                        <BackgroundField header={'Address Type'}>
                            <p>
                                EOA Wallet
                            </p>
                        </BackgroundField>
                        {
                            swap?.data?.additonal_data?.memo &&
                            <>
                                <BackgroundField isCopiable={true} toCopy={swap?.data?.additonal_data?.memo} header={'Memo'}>
                                    <p className='break-all'>
                                        {swap?.data?.additonal_data?.memo}
                                    </p>
                                </BackgroundField>
                                <WarningMessage>
                                    <p className='font-normal text-sm text-darkblue-700'>
                                        Please include the "Memo" field, it is required for a successful transfer.
                                    </p>
                                </WarningMessage>
                            </>
                        }
                    </div>
                </div>
                {
                    transferDone ?
                        <div>
                            <div className='flex place-content-center mb-16 mt-3 md:mb-8'>
                                <div className='relative'>
                                    <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                    <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                    <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-primary-800 rounded-full'></div>
                                </div>
                            </div>
                            <div className="flex text-center place-content-center mt-1 md:mt-1">
                                <label className="block text-lg font-lighter leading-6 text-primary-text">Waiting for a transaction from the network</label>
                            </div>
                            <div className='mt-6 space-y-2'>
                                <SubmitButton onClick={() => {
                                    boot();
                                    show();
                                    updateWithProps()
                                }} isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<ChatIcon className="h-5 w-5 ml-2" aria-hidden="true" />}>
                                    Contact support
                                </SubmitButton>
                                <GoHomeButton>
                                    <SubmitButton isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<HomeIcon className="h-5 w-5 ml-2" aria-hidden="true" />}>
                                        Do another swap
                                    </SubmitButton>
                                </GoHomeButton>
                            </div>
                        </div>
                        :
                        <div className="text-white text-base space-y-2">
                            <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConfirm} icon={<CheckIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                I Did The Transfer
                            </SubmitButton>
                            <GoHomeButton>
                                <SubmitButton isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<HomeIcon className="h-5 w-5 ml-2" aria-hidden="true" />}>
                                    Will do it later
                                </SubmitButton>
                            </GoHomeButton>
                        </div>
                }
            </div>
        </>
    )
}

export default WithdrawNetworkStep;

function renderGuideButton(userGuideUrlForDesktop: string, buttonText: string) {
    return <div className="w-full items-center">
        <SlideOver opener={(open) => <SubmitButton onClick={() => open()} buttonStyle='outline' isDisabled={false} size='small' isSubmitting={false}>{buttonText}</SubmitButton>} place='inStep'>
            {(close) => (
                <DocIframe onConfirm={() => close()} URl={userGuideUrlForDesktop} />
            )}
        </SlideOver>
    </div>;
}
