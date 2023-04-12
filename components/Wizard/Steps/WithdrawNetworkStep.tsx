import { ArrowLeftRight } from 'lucide-react';
import { Check, X } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../Models/Wizard';
import { useSettingsState } from '../../../context/settings';
import { useIntercom } from 'react-use-intercom';
import { useAuthState } from '../../../context/authContext';
import BackgroundField from '../../backgroundField';
import NetworkSettings from '../../../lib/NetworkSettings';
import KnownInternalNames from '../../../lib/knownIds';
import { GetSwapStatusStep } from '../../utils/SwapStatus';
import Widget from '../Widget';
import Modal from '../../modalComponent';
import { useGoHome } from '../../../hooks/useGoHome';
import toast from 'react-hot-toast';
import GuideLink from '../../guideLink';
import SimpleTimer from '../../Common/Timer';
import TransferFromWallet from './Wallet/Transfer';
import LayerSwapApiClient from '../../../lib/layerSwapApiClient';
import QRCode from 'qrcode.react';
import colors from 'tailwindcss/colors';
import tailwindConfig from '../../../tailwind.config';
import Image from 'next/image';
import SlideOver from '../../SlideOver';
import SwapGuide from '../../SwapGuide';
import SecondaryButton from '../../buttons/secondaryButton';

const WithdrawNetworkStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const [transferDoneTime, setTransferDoneTime] = useState<number>()
    const { networks, currencies, discovery: { resource_storage_url } } = useSettingsState()
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { email, userId } = useAuthState()
    const [loadingSwapCancel, setLoadingSwapCancel] = useState(false)
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swap?.id } })
    const { swap } = useSwapDataState()
    const { setInterval, cancelSwap, mutateSwap } = useSwapDataUpdate()
    const goHome = useGoHome()
    const { source_network: source_network_internal_name, destination_network_asset } = swap
    const [openSwapGuide, setOpenSwapGuide] = useState(false)
    const source_network = networks.find(n => n.internal_name === source_network_internal_name)
    const sourceCurrency = source_network.currencies.find(c => c.asset.toLowerCase() === swap.source_network_asset.toLowerCase())
    const asset = source_network?.currencies?.find(currency => currency?.asset === destination_network_asset)


    const handleOpenSwapGuide = () => {
        setOpenSwapGuide(true)
    }

    const hanldeGuideModalClose = () => {
        setOpenSwapGuide(false)
    }
    const handleOpenModal = () => {
        setOpenCancelConfirmModal(true)
    }
    useEffect(() => {
        setInterval(15000)
        return () => setInterval(0)
    }, [])

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swapStatusStep !== SwapWithdrawalStep.OffRampWithdrawal)
            goToStep(swapStatusStep)
    }, [swapStatusStep])

    const estimatedTransferTime = source_network && NetworkSettings.KnownSettings[source_network_internal_name]?.EstimatedTransferTime

    const handleTransferDone = useCallback(async () => {
        setTransferDone(true)
        const estimatedTransferTimeInSeconds = estimatedTransferTime ? (estimatedTransferTime * 60 * 1000) : 180000
        setTransferDoneTime(Date.now() + estimatedTransferTimeInSeconds)
    }, [estimatedTransferTime])

    const [openCancelConfirmModal, setOpenCancelConfirmModal] = useState(false)
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

    const onTRansactionComplete = async (trxId: string) => {
        const layerSwapApiClient = new LayerSwapApiClient()
        await layerSwapApiClient.ApplyNetworkInput(swap.id, trxId)
        await mutateSwap()
    }

    const sourceNetworkSettings = NetworkSettings.KnownSettings[source_network_internal_name]
    const userGuideUrlForDesktop = sourceNetworkSettings?.UserGuideUrlForDesktop
    const sourceChainId = sourceNetworkSettings?.ChainId
    const qrCode = (
        <QRCode
            className="p-2 bg-white rounded-md"
            value={swap?.deposit_address}
            size={120}
            bgColor={colors.white}
            fgColor={tailwindConfig.theme.extend.colors.darkblue.DEFAULT}
            level={"H"}
        />
    );

    return (
        <>
            <Widget>
                <Widget.Content>
                    <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                        <div className='space-y-4'>
                            <div className="text-left">
                                <p className="block text-md sm:text-lg font-medium text-white">
                                    Send crypto to the deposit address in {source_network?.display_name}
                                </p>
                                <p className='text-sm sm:text-base'>
                                    The swap will be completed after the transfer is detected
                                </p>
                            </div>
                            <div className='mb-6 grid grid-cols-1 gap-4'>
                                <div className='rounded-md bg-darkblue-700 border border-darkblue-500 divide-y divide-darkblue-500'>
                                    <div className={`w-full relative rounded-md px-3 py-3 shadow-sm border-darkblue-700 border bg-darkblue-700 flex flex-col items-center justify-center gap-2`}>
                                        <div className='flex items-center gap-1 text-sm my-2'>
                                            <span>Network:</span>
                                            <div className='flex space-x-1 items-center w-fit font-semibold text-white'>
                                                <Image alt="chainLogo" height='20' width='20' className='h-5 w-5 rounded-md ring-2 ring-darkblue-600' src={`${resource_storage_url}/layerswap/networks/${source_network?.internal_name.toLowerCase()}.png`}></Image>
                                                <span>{source_network?.display_name}</span>
                                            </div>
                                        </div>
                                        <div className='p-2 bg-white bg-opacity-30 rounded-xl'>
                                            <div className='p-2 bg-white bg-opacity-70 rounded-lg'>
                                                {qrCode}
                                            </div>
                                        </div>
                                    </div>
                                    {
                                        (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
                                        <BackgroundField header={'Send type'} withoutBorder>
                                            <div className='flex items-center space-x-2'>
                                                <ArrowLeftRight className='h-4 w-4' />
                                                <p>
                                                    To Another Loopring L2 Account
                                                </p>
                                            </div>
                                        </BackgroundField>
                                    }
                                    <BackgroundField Copiable={true} toCopy={swap?.deposit_address} header={'Deposit Address'} withoutBorder>
                                        <div>
                                            <p className='break-all text-white'>
                                                {swap?.deposit_address}
                                            </p>
                                            {
                                                (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
                                                <div className='flex text-xs items-center px-2 py-1 mt-1 border-2 border-darkblue-100 rounded border-dashed'>
                                                    <p>
                                                        You might get a warning that this is not an activated address. You can ignore it.
                                                    </p>
                                                </div>
                                            }
                                        </div>
                                    </BackgroundField>
                                    {
                                        (source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli || source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet) &&
                                        <div className='flex space-x-4'>
                                            <BackgroundField header={'Address Type'} withoutBorder>
                                                <p>
                                                    EOA Wallet
                                                </p>
                                            </BackgroundField>
                                        </div>
                                    }
                                    <div className='flex divide-x divide-darkblue-500'>
                                        <BackgroundField Copiable={true} toCopy={swap?.requested_amount} header={'Amount'} withoutBorder>
                                            <p>
                                                {swap?.requested_amount}
                                            </p>
                                        </BackgroundField>
                                        <BackgroundField header={'Asset'} withoutBorder>
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-5 w-5 relative">
                                                    {
                                                        asset &&
                                                        <Image
                                                            src={`${resource_storage_url}/layerswap/currencies/${asset?.name?.toLowerCase()}.png`}
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

                                <div className='grid grid-cols-2 w-full items-center gap-2'>
                                    {!swap?.destination_exchange &&
                                        <GuideLink button='End-to-end guide' buttonClassNames='bg-darkblue-800 w-full text-primary-text' userGuideUrl={userGuideUrlForDesktop ?? 'https://docs.layerswap.io/user-docs/your-first-swap/cross-chain'} place="inStep" />
                                    }
                                    <SecondaryButton className='bg-darkblue-800 w-full text-primary-text' onClick={handleOpenSwapGuide}>
                                        How it works
                                    </SecondaryButton>
                                </div>

                            </div>
                        </div>
                    </div>
                </Widget.Content>
                <Widget.Footer>
                    {
                        sourceChainId && swap &&
                        <div className='border-darkblue-500 rounded-md border bg-darkblue-700 p-3'>
                            <TransferFromWallet swapId={swap.id} networkDisplayName={source_network?.display_name} onTransferComplete={onTRansactionComplete} tokenDecimals={sourceCurrency?.decimals} tokenContractAddress={sourceCurrency?.contract_address as `0x${string}`} chainId={sourceChainId} depositAddress={swap.deposit_address as `0x${string}`} amount={swap.requested_amount} />
                        </div>
                    }
                    {!transferDone && !sourceChainId &&
                        <>
                            <div className="flex text-center mb-4 space-x-2">
                                <div className='relative'>
                                    <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                    <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                    <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                                </div>
                                <label className="text-xs self-center md:text-sm sm:font-semibold text-primary-text">Waiting for you to send {asset?.name}</label>
                            </div>
                            <div className="flex flex-row text-white text-base space-x-2">
                                <div className='basis-1/3'>
                                    <SubmitButton onClick={handleOpenModal} text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<X className='h-5 w-5' />}>
                                        <DoubleLineText
                                            colorStyle='mltln-text-dark'
                                            primaryText='Cancel'
                                            secondarytext='the swap'
                                            reversed={true}
                                        />
                                    </SubmitButton>
                                </div>
                                <div className='basis-2/3'>
                                    <SubmitButton button_align='right' text_align='left' isDisabled={false} isSubmitting={false} onClick={handleTransferDone} icon={<Check className="h-5 w-5" aria-hidden="true" />} >
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
                        transferDone && !sourceChainId &&
                        <SimpleTimer time={transferDoneTime} text={
                            () => <>
                                {`Transfers from ${source_network?.display_name} usually take less than 3 minutes`}
                            </>}
                        >
                            <div className="flex text-center mb-4 space-x-2">
                                <div className='relative'>
                                    <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                    <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                    <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                                </div>
                                <label className="text-xs self-center md:text-sm sm:font-semibold text-primary-text md:pr-10">Did the transfer but the swap is not completed yet?&nbsp;
                                    <span onClick={() => {
                                        boot();
                                        show();
                                        updateWithProps()
                                    }} className="underline hover:no-underline cursor-pointer text-primary">Contact support</span></label>
                            </div>
                        </SimpleTimer>
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
            <SlideOver imperativeOpener={[openSwapGuide, setOpenSwapGuide]} place={'inStep'} header="📖 Here's how it works">
                {() => (
                    <div className='rounded-md w-full flex flex-col items-left justify-center space-y-4 text-left'>
                        <SwapGuide swap={swap} />
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={hanldeGuideModalClose}>
                            Got it
                        </SubmitButton>
                    </div>
                )}
            </SlideOver>
        </>
    )
}


export default WithdrawNetworkStep;