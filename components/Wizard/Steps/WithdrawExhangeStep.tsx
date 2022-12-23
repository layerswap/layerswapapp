import { FC, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../Models/Wizard';
import { useRouter } from 'next/router';
import { useSettingsState } from '../../../context/settings';
import ExchangeSettings from '../../../lib/ExchangeSettings';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import BackgroundField from '../../backgroundField';
import WarningMessage from '../../WarningMessage';
import { GetSwapStatusStep } from '../../utils/SwapStatus';
import GoHomeButton from '../../utils/GoHome';
import { CheckIcon, HomeIcon, ChatIcon, XIcon } from '@heroicons/react/solid';
import Widget from '../Widget';
import Modal from '../../modalComponent';
import { useGoHome } from '../../../hooks/useGoHome';
import toast from 'react-hot-toast';
import SlideOver from '../../SlideOver';
import { DocIframe } from '../../docInIframe';
import GuideLink from '../../guideLink';
import SimpleTimer from '../../Common/Timer';
import { GetSourceDestinationData } from '../../../helpers/swapHelper';
import Image from 'next/image'

const WithdrawExchangeStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const [transferDoneTime, setTransferDoneTime] = useState<number>()
    const { exchanges, currencies, networks, discovery: { resource_storage_url } } = useSettingsState()
    const { swap } = useSwapDataState()
    const { setInterval, cancelSwap } = useSwapDataUpdate()
    const goHome = useGoHome()
    const [openCancelConfirmModal, setOpenCancelConfirmModal] = useState(false)
    const [loadingSwapCancel, setLoadingSwapCancel] = useState(false)
    const handleClose = () => {
        setOpenCancelConfirmModal(false)
    }
    const handleCancelConfirmed = useCallback(async () => {
        setLoadingSwapCancel(true)
        try {
            await cancelSwap(swap.id)
            setLoadingSwapCancel(false)
            await goHome()
        }
        catch (e) {
            setLoadingSwapCancel(false)
            toast(e.message)
        }
    }, [swap])
    const handleOpenModal = () => {
        setOpenCancelConfirmModal(true)
    }
    const [openDocSlideover, setOpenDocSlideover] = useState(false)

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

    const { currency, exchange_currency, exchange, network_chain_logo, currency_logo } = GetSourceDestinationData({ swap, currencies, exchanges, networks, resource_storage_url })


    const handleTransferDone = useCallback(async () => {
        setTransferDone(true)
        const estimatedTransferTimeInSeconds = 180000
        setTransferDoneTime(Date.now() + estimatedTransferTimeInSeconds)
    }, [])
    console.log(currency.asset)
    return (<>
        <SlideOver imperativeOpener={[openDocSlideover, setOpenDocSlideover]} place='inStep'>
            {(close) => (
                <DocIframe onConfirm={() => close()} URl={ExchangeSettings.KnownSettings[exchange.internal_name].ExchangeWithdrawalGuideUrl} />
            )}
        </SlideOver>
        <Widget>
            <Widget.Content>
                <div className="w-full flex space-y-5 flex-col justify-between h-full text-primary-text">
                    <div className='space-y-4'>
                        <div className="text-left">
                            <p className="block sm:text-lg font-medium text-white">
                                Send {currency?.asset} to the provided address
                            </p>
                            <p className='text-sm sm:text-base'>
                                The swap will be completed when your transfer is detected
                            </p>
                        </div>
                        <div className={`mb-6 grid grid-cols-1 gap-5 `}>
                            <BackgroundField isCopiable={true} isQRable={true} toCopy={swap?.deposit_address} header={'Address'}>
                                <p className='break-all'>
                                    {swap?.deposit_address}
                                </p>
                            </BackgroundField>
                            <div className='flex space-x-4'>
                                <BackgroundField isCopiable={true} toCopy={swap?.requested_amount} header={'Amount'}>
                                    <p>
                                        {swap?.requested_amount}
                                    </p>
                                </BackgroundField>
                                <BackgroundField header={'Asset'}>
                                    <div className="text-white flex items-center">
                                        <div className="flex-shrink-0 h-5 w-5 relative">
                                            {
                                                currency_logo &&
                                                <Image
                                                    src={currency_logo}
                                                    alt="From Logo"
                                                    height="60"
                                                    width="60"
                                                    layout="responsive"
                                                    className="rounded-md object-contain"
                                                />
                                            }
                                        </div>
                                        <div className="mx-1 block">{currency?.asset}</div>
                                    </div>
                                </BackgroundField>
                            </div>
                            <BackgroundField header={'Network'}>
                                <div className="text-white flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            network_chain_logo &&
                                            <Image
                                                src={network_chain_logo}
                                                alt="From Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }
                                    </div>
                                    <div className="mx-1 block">{exchange_currency?.chain_display_name}</div>
                                </div>
                            </BackgroundField>
                            {
                                ExchangeSettings.KnownSettings[exchange.internal_name]?.WithdrawalWarningMessage &&
                                <WarningMessage>
                                    <span>
                                        {ExchangeSettings.KnownSettings[exchange.internal_name]?.WithdrawalWarningMessage}
                                    </span>
                                </WarningMessage>
                            }
                            {
                                ExchangeSettings?.KnownSettings[exchange.internal_name]?.ExchangeWithdrawalGuideUrl &&
                                <WarningMessage messageType='informing'>
                                    <span className='flex-none'>
                                        Learn how to send from
                                    </span>
                                    <GuideLink text={exchange?.display_name} userGuideUrl={ExchangeSettings.KnownSettings[exchange.internal_name].ExchangeWithdrawalGuideUrl} />
                                </WarningMessage>
                            }
                        </div>
                    </div>
                </div>
            </Widget.Content>
            <Widget.Footer>

                {
                    <>
                        {
                            !transferDone &&
                            <>
                                <div className="flex text-center mb-4 space-x-2">
                                    <div className='relative'>
                                        <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                        <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                        <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                                    </div>
                                    <label className="text-xs self-center md:text-sm sm:font-semibold text-primary-text">Waiting for you to do a withdrawal from the exchange</label>
                                </div>
                                <div className="flex flex-row text-white text-base space-x-2">
                                    <div className='basis-1/3'>
                                        <SubmitButton onClick={handleOpenModal} text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<XIcon className='h-5 w-5' />}>
                                            <DoubleLineText
                                                colorStyle='mltln-text-dark'
                                                primaryText='Cancel'
                                                secondarytext='the swap'
                                                reversed={true}
                                            />
                                        </SubmitButton>
                                    </div>
                                    <div className='basis-2/3'>
                                        <SubmitButton button_align='right' text_align='left' isDisabled={false} isSubmitting={false} onClick={handleTransferDone} icon={<CheckIcon className="h-5 w-5" aria-hidden="true" />} >
                                            <DoubleLineText
                                                colorStyle='mltln-text-light'
                                                primaryText='I did'
                                                secondarytext='the transfer'
                                                reversed={true}
                                            />
                                        </SubmitButton>
                                    </div>
                                </div>
                            </>

                        }
                        {
                            transferDone &&
                            <SimpleTimer time={transferDoneTime} text={
                                (remainingSeconds) => <>
                                    {`The swap will get completed in ~${remainingSeconds > 60 ? `${(Math.ceil((remainingSeconds / 60) % 60))} minutes` : '1 minute'}  after you send from ${exchange?.display_name}`}
                                </>}
                            >
                                <div className="flex text-center mb-4 space-x-2">
                                    <div className='relative'>
                                        <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                        <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                        <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                                    </div>
                                    <label className="text-xs self-center md:text-sm sm:font-semibold text-primary-text">Did a withdrawal but the swap is not completed yet?&nbsp;
                                        <span onClick={() => {
                                            boot();
                                            show();
                                            updateWithProps()
                                        }} className="underline hover:no-underline cursor-pointer text-primary">Contact support</span></label>
                                </div>
                            </SimpleTimer>
                        }
                    </>
                }
            </Widget.Footer>
        </Widget>
        <Modal showModal={openCancelConfirmModal} setShowModal={handleClose} title="Do NOT cancel if you have already sent crypto" modalSize='medium'>
            <div className='text-primary-text mb-4'></div>
            <div className="flex flex-row text-white text-base space-x-2">
                <div className='basis-1/2'>
                    <SubmitButton text_align='left' isDisabled={loadingSwapCancel} isSubmitting={loadingSwapCancel} onClick={handleCancelConfirmed} buttonStyle='outline' size="medium" >
                        <DoubleLineText
                            colorStyle='mltln-text-dark'
                            primaryText='Cancel the swap'
                            secondarytext='and go to home'
                            reversed={true}
                        />
                    </SubmitButton>
                </div>
                <div className='basis-1/2'>
                    <SubmitButton button_align='right' text_align='left' isDisabled={loadingSwapCancel} isSubmitting={false} onClick={handleClose} size='medium'>
                        <DoubleLineText
                            colorStyle='mltln-text-light'
                            primaryText="Don't"
                            secondarytext='cancel'
                            reversed={true}
                        />
                    </SubmitButton>
                </div>
            </div>
        </Modal>
    </>
    )
}

export default WithdrawExchangeStep;