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
import { CheckIcon, SwitchHorizontalIcon, XIcon } from '@heroicons/react/solid';
import Widget from '../Widget';
import SlideOver from '../../SlideOver';
import { DocIframe } from '../../docInIframe';
import GuideLink from '../../guideLink';
import SimpleTimer from '../../Common/Timer';
import { GetSourceDestinationData } from '../../../helpers/swapHelper';
import Image from 'next/image'
import { SwapCancelModal } from './PendingSwapsStep';
import LayerSwapApiClient from '../../../lib/layerSwapApiClient';
import toast from 'react-hot-toast';
import AccountConnectStep from './CoinbaseAccountConnectStep';
import KnownInternalNames from '../../../lib/knownIds';
import { KnownwErrorCode } from '../../../Models/ApiError';
import Coinbase2FA from '../../Coinbase2FA';
import { useTimerState } from '../../../context/timerContext';
import SpinIcon from '../../icons/spinIcon';
import Modal from '../../modalComponent';
import { LinkIcon } from '@heroicons/react/outline';
const TIMER_SECONDS = 120
const WithdrawExchangeStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const [transferDoneTime, setTransferDoneTime] = useState<number>()
    const { exchanges, currencies, networks, discovery: { resource_storage_url } } = useSettingsState()
    const { swap, codeRequested } = useSwapDataState()
    const { setInterval, setCodeRequested } = useSwapDataUpdate()
    const [openCancelConfirmModal, setOpenCancelConfirmModal] = useState(false)
    const [openCoinbaseConnectSlideover, setOpenCoinbaseConnectSlideover] = useState(false)
    const [openCoinbase2FA, setOpenCoinbase2FA] = useState(false)
    const { start: startTimer } = useTimerState()
    const [authorized, steAuthorized] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(false)
    const { source_exchange: source_exchange_internal_name, destination_network: destination_network_internal_name, destination_network_asset } = swap

    const source_exchange = exchanges.find(e => e.internal_name === source_exchange_internal_name)
    const destination_network = networks.find(n => n.internal_name === destination_network_internal_name)

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

    const sourceIsCoinbase = swap.source_exchange?.toLocaleLowerCase() === KnownInternalNames.Exchanges.Coinbase.toLocaleLowerCase()

    useEffect(() => {
        if (swapStatusStep && swapStatusStep !== SwapWithdrawalStep.Withdrawal) {
            goToStep(swapStatusStep)
        }
    }, [swapStatusStep])

    useEffect(() => {
        if (sourceIsCoinbase) {
            (async () => {
                try {
                    const layerswapApiClient = new LayerSwapApiClient(router)
                    const res = await layerswapApiClient.GetExchangeAccount(swap?.source_exchange, 1)
                    if (res.data) {
                        steAuthorized(true)
                    }
                    else {
                        steAuthorized(false)
                    }
                }
                catch (e) {
                    if (e?.response?.data?.error?.code === KnownwErrorCode.NOT_FOUND)
                        steAuthorized(false)
                    else
                        toast(e?.response?.data?.error?.message || e.message)
                }
            })()
        }
    }, [sourceIsCoinbase])


    const handleTransferDone = useCallback(async () => {
        setTransferDone(true)
        const estimatedTransferTimeInSeconds = 180000
        setTransferDoneTime(Date.now() + estimatedTransferTimeInSeconds)
    }, [])

    const handleTransfer = useCallback(async () => {
        if (codeRequested)
            setOpenCoinbase2FA(true)
        else {
            setSubmitting(true)
            try {
                const layerswapApiClient = new LayerSwapApiClient()
                await layerswapApiClient.WithdrawFromExchange(swap.id, swap.source_exchange)
            }
            catch (e) {
                if (e?.response?.data?.error?.code === KnownwErrorCode.COINBASE_INVALID_2FA) {
                    startTimer(TIMER_SECONDS)
                    setCodeRequested(true)
                    setOpenCoinbase2FA(true)
                }
                else if (e?.response?.data?.error?.code === KnownwErrorCode.INVALID_CREDENTIALS || e?.response?.data?.error?.code === KnownwErrorCode.COINBASE_AUTHORIZATION_LIMIT_EXCEEDED) {
                    steAuthorized(false)
                    setCodeRequested(false)
                    setOpenCoinbaseConnectSlideover(true)
                }
                else if (e?.response?.data?.error?.message) {
                    toast(e?.response?.data?.error?.message)
                }
                else if (e?.message)
                    toast(e.message)
            }
            setSubmitting(false)
        }
    }, [swap, destination_network, codeRequested])

    const openConnect = () => {
        setOpenCoinbaseConnectSlideover(true)
    }

    return (<>
        <SlideOver imperativeOpener={[openDocSlideover, setOpenDocSlideover]} place='inModal'>
            {(close) => (
                <DocIframe onConfirm={() => close()} URl={ExchangeSettings.KnownSettings[source_exchange_internal_name].ExchangeWithdrawalGuideUrl} />
            )}
        </SlideOver>
        <Modal title={`Please connect your ${source_exchange?.display_name} account`} showModal={openCoinbaseConnectSlideover} setShowModal={setOpenCoinbaseConnectSlideover} >
            <AccountConnectStep hideHeader onDoNotConnect={() => setOpenCoinbaseConnectSlideover(false)} onAuthorized={() => { steAuthorized(true); setOpenCoinbaseConnectSlideover(false); }} stickyFooter={false} />
        </Modal>
        <Modal showModal={openCoinbase2FA} setShowModal={setOpenCoinbase2FA}>
            <Coinbase2FA onSuccess={async () => setOpenCoinbase2FA(false)} />
        </Modal>
        <Widget>
            {
                loading ?
                    <div className="w-full h-full flex items-center"><SpinIcon className="animate-spin h-8 w-8 grow" /></div>
                    :
                    <Widget.Content>
                        <div className="w-full flex space-y-5 flex-col justify-between h-full text-primary-text min-h-[420px]">
                            <div className='space-y-4'>
                                <div className="text-left">
                                    <p className="block sm:text-lg font-medium text-white">
                                        Send {destination_network_asset} to the provided address from {source_exchange?.display_name}
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
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-5 w-5 relative">
                                                    {
                                                        destination_network_asset &&
                                                        <Image
                                                            src={`${resource_storage_url}/layerswap/currencies/${destination_network_asset.toLocaleLowerCase()}.png`}
                                                            alt="From Logo"
                                                            height="60"
                                                            width="60"
                                                            className="rounded-md object-contain"
                                                        />
                                                    }
                                                </div>
                                                <div className="mx-1 block">{destination_network_asset}</div>
                                            </div>
                                        </BackgroundField>
                                    </div>
                                    <BackgroundField header={'Network'}>
                                        <div className="flex items-center">
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
                                        ExchangeSettings.KnownSettings[exchange?.internal_name]?.WithdrawalWarningMessage &&
                                        <WarningMessage>
                                            <span>
                                                {ExchangeSettings.KnownSettings[exchange?.internal_name]?.WithdrawalWarningMessage}
                                            </span>
                                        </WarningMessage>
                                    }
                                    {
                                        ExchangeSettings?.KnownSettings[exchange?.internal_name]?.ExchangeWithdrawalGuideUrl &&
                                        <WarningMessage messageType='informing'>
                                            <span className='flex-none'>
                                                Learn how to send from
                                            </span>
                                            <GuideLink text={exchange?.display_name} userGuideUrl={ExchangeSettings.KnownSettings[exchange?.internal_name].ExchangeWithdrawalGuideUrl} />
                                        </WarningMessage>
                                    }
                                </div>
                            </div>
                        </div>
                    </Widget.Content>
            }
            <Widget.Footer>
                {!loading &&
                    <>
                        {
                            !transferDone &&
                            <>
                                {
                                    sourceIsCoinbase &&
                                    <div className='mb-4'>
                                        {
                                            authorized ? <SubmitButton buttonStyle='outline' isDisabled={loading} isSubmitting={loading} onClick={handleTransfer} icon={<SwitchHorizontalIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                                Transfer using Coinbase
                                            </SubmitButton> :
                                                <SubmitButton buttonStyle='outline' isDisabled={loading} isSubmitting={loading} onClick={openConnect} icon={<LinkIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                                    Connect Coinbase
                                                </SubmitButton>
                                        }
                                    </div>
                                }
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
                                        <SubmitButton className='plausible-event-name=I+did+the+transfer' button_align='right' text_align='left' isDisabled={false} isSubmitting={false} onClick={handleTransferDone} icon={<CheckIcon className="h-5 w-5" aria-hidden="true" />} >
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
        <SwapCancelModal swapToCancel={swap} openCancelConfirmModal={openCancelConfirmModal} setOpenCancelConfirmModal={setOpenCancelConfirmModal} />
    </>
    )
}


export default WithdrawExchangeStep;