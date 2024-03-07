import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import Modal from '../../../modal/modal';
import Authorize from './Authorize';
import Coinbase2FA from './Coinbase2FA';
import { ArrowLeftRight, Link } from 'lucide-react';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import LayerSwapApiClient, { PublishedSwapTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { LSAPIKnownErrorCode } from '../../../../Models/ApiError';
import toast from 'react-hot-toast';
import { useSettingsState } from '../../../../context/settings';
import { TimerProvider, useTimerState } from '../../../../context/timerContext';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
const TIMER_SECONDS = 120

const Coinbase: FC = () => {
    return <TimerProvider>
        <TransferElements />
    </TimerProvider>
}

const TransferElements: FC = () => {
    const { swap, codeRequested } = useSwapDataState()
    const { setCodeRequested, mutateSwap } = useSwapDataUpdate()
    const { layers } = useSettingsState()

    const { start: startTimer } = useTimerState()
    const { setSwapTransaction } = useSwapTransactionStore();

    const [showCoinbaseConnectModal, setShowCoinbaseConnectModal] = useState(false)
    const [openCoinbase2FA, setOpenCoinbase2FA] = useState(false)

    const [loading, setLoading] = useState(false)

    const handleTransfer = useCallback(async () => {
        if (!swap || !swap.source_exchange)
            return
        setLoading(true)
        if (codeRequested)
            setOpenCoinbase2FA(true)
        else {
            try {
                const layerswapApiClient = new LayerSwapApiClient()
                await layerswapApiClient.WithdrawFromExchange(swap.id, swap.source_exchange.name)
            }
            catch (e) {
                if (e?.response?.data?.error?.code === LSAPIKnownErrorCode.COINBASE_INVALID_2FA) {
                    startTimer(TIMER_SECONDS)
                    setCodeRequested(true)
                    setOpenCoinbase2FA(true)
                }
                else if (e?.response?.data?.error?.code === LSAPIKnownErrorCode.INVALID_CREDENTIALS || e?.response?.data?.error?.code === LSAPIKnownErrorCode.COINBASE_AUTHORIZATION_LIMIT_EXCEEDED) {
                    setCodeRequested(false)
                    alert("You have not authorized enough to be able to complete the transfer. Please authorize again.")
                }
                else if (e?.response?.data?.error?.message) {
                    toast(e?.response?.data?.error?.message)
                }
                else if (e?.message)
                    toast(e.message)
            }
        }
        setLoading(false)
    }, [swap, codeRequested])

    const openConnect = () => {
        setShowCoinbaseConnectModal(true)
    }

    const handleSuccess = useCallback(async (swapId: string) => {
        setOpenCoinbase2FA(false)
        setSwapTransaction(swapId, PublishedSwapTransactionStatus.Completed, "_")
    }, [])

    const handleAuthorized = async () => {
        setLoading(true);
        setShowCoinbaseConnectModal(false)
        await mutateSwap()
        setLoading(false);
    }

    return (
        <>
            <Modal
                height='fit'
                show={showCoinbaseConnectModal}
                setShow={setShowCoinbaseConnectModal}
                header={`Connect your Coinbase account`}
                modalId='authorize'
            >
                <Authorize
                    hideHeader
                    onDoNotConnect={() => setShowCoinbaseConnectModal(false)}
                    onAuthorized={handleAuthorized}
                    stickyFooter={false}
                />
            </Modal>
            <Modal
                height='90%'
                show={openCoinbase2FA}
                setShow={setOpenCoinbase2FA}
                modalId='coinbase2FA'
            >
                <Coinbase2FA
                    onSuccess={handleSuccess}
                    footerStickiness={false}
                />
            </Modal>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    <div className='border-secondary-500 rounded-md border bg-secondary-700 p-3'>
                        {
                            swap?.exchange_account_connected ?
                                <SubmitButton
                                    isDisabled={loading}
                                    isSubmitting={loading}
                                    onClick={handleTransfer}
                                    icon={<ArrowLeftRight
                                        className="h-5 w-5 ml-2"
                                        aria-hidden="true"
                                    />}
                                >
                                    Transfer using Coinbase
                                </SubmitButton>
                                :
                                <SubmitButton
                                    isDisabled={loading}
                                    isSubmitting={loading}
                                    onClick={openConnect}
                                    icon={<Link
                                        className="h-5 w-5 ml-2"
                                        aria-hidden="true" />
                                    }
                                >
                                    Connect Coinbase account
                                </SubmitButton>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}


export default Coinbase;