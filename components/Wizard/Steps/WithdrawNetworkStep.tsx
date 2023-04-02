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
import WarningMessage from '../../WarningMessage';
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

const WithdrawNetworkStep: FC = () => {
    const [transferDone, setTransferDone] = useState(false)
    const [transferDoneTime, setTransferDoneTime] = useState<number>()
    const { networks } = useSettingsState()
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { email, userId } = useAuthState()
    const [loadingSwapCancel, setLoadingSwapCancel] = useState(false)
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swap?.id } })
    const { swap } = useSwapDataState()
    const { setInterval, cancelSwap } = useSwapDataUpdate()
    const goHome = useGoHome()
    const { source_network: source_network_internal_name, destination_network_asset } = swap
    const source_network = networks.find(n => n.internal_name === source_network_internal_name)

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

    const handleOpenModal = () => {
        setOpenCancelConfirmModal(true)
    }
    const sourceNetworkSettings = NetworkSettings.KnownSettings[source_network_internal_name]
    const userGuideUrlForDesktop = sourceNetworkSettings?.UserGuideUrlForDesktop
    const sourceChainId = sourceNetworkSettings?.ChainId
    return (
        <>
            <Widget>
                <Widget.Content>
                    <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                        <div className='space-y-4'>
                            <div className="text-left">
                                <p className="block text-md sm:text-lg font-medium text-white">
                                    Send crypto to the provided address from {source_network?.display_name}
                                </p>
                                <p className='text-sm sm:text-base'>
                                    The swap will be completed after the transfer is detected
                                </p>
                            </div>
                            <div className='mb-6 grid grid-cols-1 gap-4'>
                                {
                                    (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
                                    <BackgroundField header={'Send type'}>
                                        <div className='flex items-center space-x-2'>
                                            <ArrowLeftRight className='h-4 w-4' />
                                            <p>
                                                To Another Loopring L2 Account
                                            </p>
                                        </div>
                                    </BackgroundField>
                                }
                                <BackgroundField isCopiable={true} isQRable={true} toCopy={swap?.deposit_address} header={'Recipient'}>
                                    <div>
                                        <p className='break-all'>
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
                                        <BackgroundField header={'Address Type'}>
                                            <p>
                                                EOA Wallet
                                            </p>
                                        </BackgroundField>
                                    </div>
                                }
                                <div className='flex space-x-4'>
                                    <BackgroundField isCopiable={true} toCopy={swap?.requested_amount} header={'Amount'}>
                                        <p>
                                            {swap?.requested_amount}
                                        </p>
                                    </BackgroundField>
                                    <BackgroundField header={'Asset'}>
                                        <p>
                                            {destination_network_asset}
                                        </p>
                                    </BackgroundField>
                                </div>
                                {
                                    userGuideUrlForDesktop &&
                                    <WarningMessage messageType='informing'>
                                        <span className='flex-none'>
                                            Learn how to send from
                                        </span>
                                        <GuideLink text='Loopring Web' userGuideUrl={userGuideUrlForDesktop} place="inStep" />
                                    </WarningMessage>
                                }
                                {
                                    !swap?.destination_exchange &&
                                    <WarningMessage messageType='informing'>
                                        <span className='flex-none'>
                                            Learn how to do
                                        </span>
                                        <GuideLink text='Cross-Chain swap' userGuideUrl='https://docs.layerswap.io/user-docs/your-first-swap/cross-chain' place="inStep" />
                                    </WarningMessage>
                                }
                            </div>
                        </div>
                    </div>
                </Widget.Content>
                <Widget.Footer>
                    {
                        sourceChainId &&
                        <TransferFromWallet asset={swap.source_network_asset} chainId={sourceChainId} depositAddress={swap.deposit_address as `0x${string}`} amount={swap.requested_amount}/>
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


export default WithdrawNetworkStep;