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
import { Check, ArrowLeftRight, X, Link } from 'lucide-react';
import Widget from '../Widget';
import Modal from '../../modal/modal';
import { DocIframe } from '../../docInIframe';
import GuideLink from '../../guideLink';
import SimpleTimer from '../../Common/Timer';
import Image from 'next/image'
import { SwapCancelModal } from './PendingSwapsStep';
import LayerSwapApiClient, { DepositAddress, DepositAddressSource } from '../../../lib/layerSwapApiClient';
import toast from 'react-hot-toast';
import AccountConnectStep from './CoinbaseAccountConnectStep';
import KnownInternalNames from '../../../lib/knownIds';
import { KnownwErrorCode } from '../../../Models/ApiError';
import Coinbase2FA from '../../Coinbase2FA';
import { useTimerState } from '../../../context/timerContext';
import SpinIcon from '../../icons/spinIcon';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../../shadcn/select';
import QRCode from 'qrcode.react';
import colors from 'tailwindcss/colors';
import tailwindConfig from '../../../tailwind.config';
import SwapGuide from '../../SwapGuide';
import SecondaryButton from '../../buttons/secondaryButton';
import { ApiResponse } from '../../../Models/ApiResponse';
import useSWR from 'swr';

const TIMER_SECONDS = 120
const WithdrawExchangeStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const [transferDoneTime, setTransferDoneTime] = useState<number>()
    const { exchanges, networks, resolveImgSrc } = useSettingsState()
    const { swap, codeRequested } = useSwapDataState()
    const { setInterval, setCodeRequested, mutateSwap } = useSwapDataUpdate()
    const [openCancelConfirmModal, setShowCancelConfirmModal] = useState(false)
    const [showCoinbaseConnectModal, setShowCoinbaseConnectModal] = useState(false)
    const [openCoinbase2FA, setOpenCoinbase2FA] = useState(false)
    const { start: startTimer } = useTimerState()
    const [authorized, steAuthorized] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(false)
    const { source_exchange: source_exchange_internal_name, destination_network: destination_network_internal_name, source_network_asset: source_network_asset, destination_network_asset } = swap
    const [showDocModal, setShowDocModal] = useState(false)
    const [showSwapGuideModal, setShowSwapGuideModal] = useState(false)

    const source_exchange = exchanges.find(e => e.internal_name === source_exchange_internal_name)
    const destination_network = networks.find(n => n.internal_name === destination_network_internal_name)
    const source_network_currency = source_exchange?.currencies?.find(c => source_network_asset?.toUpperCase() === c?.asset?.toUpperCase() && c?.is_default)

    const source_exchange_settings = ExchangeSettings.KnownSettings[source_exchange_internal_name]

    const availableNetworks = source_exchange?.currencies?.filter(c => c.asset === swap?.source_network_asset && networks.find(n => n.internal_name === c.network).status === 'active').map(n => n.network)
    const sourceNetworks = networks.filter(n => availableNetworks.includes(n.internal_name))
    const defaultSourceNetwork = sourceNetworks.find(sn => sn.internal_name === source_network_currency.network)
    const asset = defaultSourceNetwork?.currencies?.find(currency => currency?.asset === destination_network_asset)

    const layerswapApiClient = new LayerSwapApiClient()
    const [selectedSourceNetwork, setSelectedSourceNetwork] = useState(defaultSourceNetwork)

    const { data: generatedDeposit } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${selectedSourceNetwork?.internal_name}?source=${DepositAddressSource.UserGenerated}`, layerswapApiClient.fetcher)
    const generatedDepositAddress = generatedDeposit?.data?.address

    const handleChangeSelectedNetwork = (n: string) => {
        const network = networks.find(network => network.internal_name === n)
        setSelectedSourceNetwork(network)
    }

    useEffect(() => {
        setInterval(15000)
        return () => setInterval(0)
    }, [])

    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const router = useRouter();
    const { swapId } = router.query;
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swapId } })

    const swapStatusStep = GetSwapStatusStep(swap)

    const sourceIsCoinbase = swap.source_exchange?.toLowerCase() === KnownInternalNames.Exchanges.Coinbase.toLowerCase()

    const handleCancelSwap = useCallback(() => {
        mutateSwap()
    }, [mutateSwap])

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
        const estimatedTransferTimeInSeconds = 600000
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
                    setShowCoinbaseConnectModal(true)
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
        setShowCoinbaseConnectModal(true)
    }

    const qrCode = (
        <QRCode
            className="p-2 bg-white rounded-md"
            value={generatedDepositAddress}
            size={120}
            bgColor={colors.white}
            fgColor={tailwindConfig.theme.extend.colors.darkblue.DEFAULT}
            level={"H"}
        />
    );

    return (<>
        <Modal height='full' show={showDocModal} setShow={setShowDocModal} >
            <DocIframe onConfirm={() => setShowDocModal(false)} URl={source_exchange_settings?.ExchangeWithdrawalGuideUrl} />
        </Modal>
        <Modal height='full' show={showCoinbaseConnectModal} setShow={setShowCoinbaseConnectModal} header={`Connect your ${source_exchange?.display_name} account`}  >
            <AccountConnectStep hideHeader onDoNotConnect={() => setShowCoinbaseConnectModal(false)} onAuthorized={() => { steAuthorized(true); setShowCoinbaseConnectModal(false); }} stickyFooter={false} />
        </Modal>
        <Modal show={openCoinbase2FA} setShow={setOpenCoinbase2FA}>
            <Coinbase2FA onSuccess={async () => setOpenCoinbase2FA(false)} footerStickiness={false} />
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
                                    <p className="block font-medium text-white">
                                        Send crypto to the deposit address
                                    </p>
                                    <p className='text-sm'>
                                        The swap will be completed after the transfer is detected
                                    </p>
                                </div>
                                <div className={`mb-6 grid grid-cols-1 gap-5 `}>
                                    <div className='rounded-md bg-darkblue-700 border border-darkblue-500 divide-y divide-darkblue-500'>
                                        <div className={`w-full relative rounded-md px-3 py-3 shadow-sm border-darkblue-700 border bg-darkblue-700 flex flex-col items-center justify-center gap-2`}>
                                            <div className='flex items-center gap-1 text-sm my-2'>
                                                <span>Network:</span>
                                                {sourceNetworks.length === 1 ?
                                                    <div className='flex space-x-1 items-center w-fit font-semibold text-white'>
                                                        <Image alt="chainLogo" height='20' width='20' className='h-5 w-5 rounded-md ring-2 ring-darkblue-600' src={resolveImgSrc(sourceNetworks[0])}></Image>
                                                        <span>{sourceNetworks[0].display_name}</span>
                                                    </div>
                                                    :
                                                    <Select onValueChange={v => handleChangeSelectedNetwork(v)} defaultValue={defaultSourceNetwork?.internal_name}>
                                                        <SelectTrigger className="w-fit border-none !text-white !font-semibold !h-fit !p-0">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectGroup>
                                                                <SelectLabel>Networks</SelectLabel>
                                                                {sourceNetworks.map(sn => (
                                                                    <SelectItem key={sn.internal_name} value={sn.internal_name}>
                                                                        <div className="flex items-center">
                                                                            <div className="flex-shrink-0 h-5 w-5 relative">
                                                                                {
                                                                                    sn &&
                                                                                    <Image
                                                                                        src={resolveImgSrc(sn)}
                                                                                        alt="From Logo"
                                                                                        height="60"
                                                                                        width="60"
                                                                                        className="rounded-md object-contain"
                                                                                    />
                                                                                }
                                                                            </div>
                                                                            <div className="mx-1 block">{sn?.display_name}</div>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </SelectContent>
                                                    </Select>
                                                }
                                            </div>
                                            <div className='p-2 bg-white bg-opacity-30 rounded-xl'>
                                                <div className='p-2 bg-white bg-opacity-70 rounded-lg'>
                                                    {qrCode}
                                                </div>
                                            </div>
                                        </div>
                                        <BackgroundField Copiable toCopy={generatedDepositAddress} header={'Deposit Address'} withoutBorder>
                                            <div>
                                                {
                                                    generatedDepositAddress ?
                                                        <p className='break-all text-white'>
                                                            {generatedDepositAddress}
                                                        </p>
                                                        :
                                                        <div className='bg-gray-500 w-56 h-5 animate-pulse rounded-md' />
                                                }
                                            </div>
                                        </BackgroundField>
                                        <div className='flex divide-x divide-darkblue-500'>
                                            <BackgroundField Copiable toCopy={swap?.requested_amount} header={'Amount'} withoutBorder>
                                                <p>
                                                    {swap?.requested_amount}
                                                </p>
                                            </BackgroundField>
                                            <BackgroundField header={'Asset'} withoutBorder>
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                                        {
                                                            asset?.name &&
                                                            <Image
                                                                src={resolveImgSrc({ asset: asset?.name })}
                                                                alt="From Logo"
                                                                height="60"
                                                                width="60"
                                                                className="rounded-md object-contain"
                                                            />
                                                        }
                                                    </div>
                                                    <div className="mx-1 block">{asset?.name}</div>
                                                </div>
                                            </BackgroundField>
                                        </div>
                                    </div>
                                    {
                                        source_exchange_settings?.WithdrawalWarningMessage &&
                                        <WarningMessage>
                                            <span>
                                                {source_exchange_settings.WithdrawalWarningMessage}
                                            </span>
                                        </WarningMessage>
                                    }
                                    <div className='grid grid-cols-2 w-full items-center gap-2'>
                                        {
                                            source_exchange_settings?.ExchangeWithdrawalGuideUrl &&
                                            <GuideLink button='End-to-end guide' buttonClassNames='bg-darkblue-800 w-full text-primary-text' userGuideUrl={source_exchange_settings?.ExchangeWithdrawalGuideUrl} />
                                        }
                                        <SecondaryButton className='bg-darkblue-800 w-full text-primary-text' onClick={() => setShowSwapGuideModal(true)}>
                                            How it works
                                        </SecondaryButton>
                                    </div>
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
                                            authorized ? <SubmitButton buttonStyle='outline' isDisabled={loading} isSubmitting={loading} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                                Transfer using Coinbase
                                            </SubmitButton> :
                                                <SubmitButton buttonStyle='outline' isDisabled={loading} isSubmitting={loading} onClick={openConnect} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
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
                                    <label className="text-xs self-center md:text-sm sm:font-semibold text-primary-text">Waiting for you to send {asset?.name} from the exchange</label>
                                </div>
                                <div className="flex flex-row text-white text-base space-x-2">
                                    <div className='basis-1/3'>
                                        <SubmitButton onClick={() => setShowCancelConfirmModal(true)} text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<X className='h-5 w-5' />}>
                                            <DoubleLineText
                                                colorStyle='mltln-text-dark'
                                                primaryText='Cancel'
                                                secondarytext='the swap'
                                                reversed={true}
                                            />
                                        </SubmitButton>
                                    </div>
                                    <div className='basis-2/3'>
                                        <SubmitButton className='plausible-event-name=I+did+the+transfer' button_align='right' text_align='left' isDisabled={false} isSubmitting={false} onClick={handleTransferDone} icon={<Check className="h-5 w-5" aria-hidden="true" />} >
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
                                    {`Transfers from ${source_exchange?.display_name} usually take less than 10 minutes`}
                                </>}
                            >
                                <div className="flex text-center mb-4 space-x-2">
                                    <div className='relative'>
                                        <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                        <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                        <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                                    </div>
                                    <label className="text-xs self-center md:text-sm sm:font-semibold text-primary-text">Did the transfer but the swap is not completed yet?&nbsp;
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
        </Widget >
        <Modal height='full' show={showSwapGuideModal} setShow={setShowSwapGuideModal} header="📖 Here's how it works">
            <div className='rounded-md w-full flex flex-col items-left justify-center space-y-6 text-left'>
                <SwapGuide swap={swap} />
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => setShowSwapGuideModal(false)}>
                    Got it
                </SubmitButton>
            </div>
        </Modal>
        <SwapCancelModal onCancel={handleCancelSwap} swapToCancel={swap} openCancelConfirmModal={openCancelConfirmModal} setOpenCancelConfirmModal={setShowCancelConfirmModal} />
    </>
    )
}


export default WithdrawExchangeStep;
