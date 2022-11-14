import { FC, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../Models/Wizard';
import { useRouter } from 'next/router';
import { useSettingsState } from '../../../context/settings';
import Image from 'next/image'
import ExchangeSettings from '../../../lib/ExchangeSettings';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import BackgroundField from '../../backgroundField';
import WarningMessage from '../../WarningMessage';
import { GetSwapStatusStep } from '../../utils/SwapStatus';
import GoHomeButton from '../../utils/GoHome';
import { CheckIcon, HomeIcon, ChatIcon } from '@heroicons/react/solid';
import Widget from '../Widget';

const WithdrawExchangeStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const { exchanges, discovery: { resource_storage_url } } = useSettingsState()
    const { swap } = useSwapDataState()
    const { setInterval } = useSwapDataUpdate()

    useEffect(() => {
        setInterval(2000)
        return () => setInterval(0)
    }, [])

    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const router = useRouter();
    const { swapId } = router.query;
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swapId } })

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swapStatusStep !== SwapWithdrawalStep.Withdrawal)
            goToStep(swapStatusStep)
    }, [swapStatusStep])

    const handleConfirm = useCallback(async () => {
        setTransferDone(true)
    }, [])

    const exchange = exchanges?.find(e => e.currencies.some(ec => ec.id === swap?.exchange_currency_id))
    const currency = exchange?.currencies?.find(c => c.id === swap?.exchange_currency_id)
    const exchange_name = exchange?.display_name || ' '
    const exchange_internal_name = exchange?.internal_name
    const exchange_logo_url = exchange?.logo

    return (
        <Widget>
            <Widget.Content>
                <div className="w-full flex space-y-5 flex-col justify-between h-full text-primary-text">
                    <div className='space-y-4'>
                        <div className="flex items-center">
                            <h3 className="block text-lg font-medium text-white leading-6 text-left">
                                Go to
                                {
                                    exchange_logo_url &&
                                    <div className="inline-block ml-2 mr-1" style={{ position: "relative", top: '6px' }}>
                                        <div className="flex-shrink-0 h-6 w-6 relative">
                                            <Image
                                                src={`${resource_storage_url}${exchange_logo_url}`}
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
                                <span className='mr-1'>
                                    {exchange_name}
                                </span> and do a withdrawal to the provided address
                            </h3>
                        </div>
                        {
                            swap?.additonal_data?.note &&
                            <WarningMessage>
                                <p className='font-semibold text-sm text-darkblue-700'>
                                    Please fill the "Remarks" field and make sure the "Internal transfer" checkbox is checked, that's required for a successful transfer.
                                </p>
                            </WarningMessage>
                        }
                        <div className={`mb-6 grid grid-cols-1 gap-5 `}>
                            <BackgroundField isCopiable={true} isQRable={true} toCopy={swap?.additonal_data?.deposit_address} header={'Address'}>
                                <p className='break-all'>
                                    {swap?.additonal_data?.deposit_address}
                                </p>
                            </BackgroundField>
                            <BackgroundField header={'Network'}>
                                <p>
                                    {swap?.additonal_data?.chain_display_name}
                                </p>
                            </BackgroundField>
                            <div className='flex space-x-4'>
                                <BackgroundField isCopiable={true} toCopy={swap?.requested_amount} header={'Amount'}>
                                    <p>
                                        {swap?.requested_amount}
                                    </p>
                                </BackgroundField>
                                <BackgroundField header={'Asset'}>
                                    <p>
                                        {currency?.asset}
                                    </p>
                                </BackgroundField>
                            </div>
                            {
                                swap?.additonal_data?.note &&
                                <>
                                    <BackgroundField isCopiable={true} toCopy={swap?.additonal_data?.note} header={'Remarks'}>
                                        <p className='break-all'>
                                            {swap?.additonal_data?.note}
                                        </p>
                                    </BackgroundField>
                                </>
                            }
                            {
                                ExchangeSettings.KnownSettings[exchange_internal_name]?.WithdrawalWarningMessage &&
                                <WarningMessage>
                                    <p className='font-normal text-sm text-darkblue-700'>
                                        {ExchangeSettings.KnownSettings[exchange_internal_name]?.WithdrawalWarningMessage}
                                    </p>
                                </WarningMessage>
                            }
                        </div>
                    </div>
                </div>
            </Widget.Content>
            <Widget.Footer>
                {
                    transferDone ?
                        <div>
                            <div className="flex text-center mb-4 space-x-2">
                                <div className='relative'>
                                    <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                    <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                    <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                                </div>
                                <label className="text-xs self-center md:text-sm font-semibold text-primary-text">Waiting for you to do a withdrawal from the exchange</label>
                            </div>
                            <div className="flex flex-row text-white text-base space-x-2">
                                <div className='basis-1/3'>
                                    <SubmitButton text_align='left' onClick={() => {
                                        boot();
                                        show();
                                        updateWithProps()
                                    }} isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<ChatIcon className="h-5 w-5" aria-hidden="true" />}>
                                        <DoubleLineText
                                            colorStyle='mltln-text-dark'
                                            primaryText='Support'
                                            secondarytext='Contact'
                                        />
                                    </SubmitButton>
                                </div>
                                <div className='basis-2/3'>
                                    <GoHomeButton>
                                        <SubmitButton button_align='right' text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<HomeIcon className="h-5 w-5" aria-hidden="true" />}>
                                            <DoubleLineText
                                                colorStyle='mltln-text-dark'
                                                primaryText='Swap'
                                                secondarytext='Do another'
                                            />
                                        </SubmitButton>
                                    </GoHomeButton>
                                </div>
                            </div>
                        </div>
                        :
                        <div className="flex flex-row text-white text-base space-x-2">
                            <div className='basis-1/3'>
                                <GoHomeButton>
                                    <SubmitButton text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<HomeIcon className="h-5 w-5" aria-hidden="true" />}>
                                        <DoubleLineText
                                            colorStyle='mltln-text-dark'
                                            primaryText='Later'
                                            secondarytext='Will do it'
                                        />
                                    </SubmitButton>
                                </GoHomeButton>
                            </div>
                            <div className='basis-2/3'>
                                <SubmitButton button_align='right' text_align='left' isDisabled={false} isSubmitting={false} onClick={handleConfirm} icon={<CheckIcon className="h-5 w-5" aria-hidden="true" />} >
                                    <DoubleLineText
                                        colorStyle='mltln-text-light'
                                        primaryText='Done'
                                        secondarytext='The transfer is'
                                    />
                                </SubmitButton>
                            </div>
                        </div>
                }
            </Widget.Footer>
        </Widget>
    )
}

export default WithdrawExchangeStep;
