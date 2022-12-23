import { ExternalLinkIcon, XIcon } from '@heroicons/react/outline';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import toast from 'react-hot-toast';
import Modal from '../../modalComponent';
import Widget from '../Widget';
import LayerSwapApiClient, { SwapItem, SwapType } from '../../../lib/layerSwapApiClient';
import Image from 'next/image'
import useSWR from 'swr';
import { ApiResponse } from '../../../Models/ApiResponse';
import { useSettingsState } from '../../../context/settings';
import shortenAddress from '../../utils/ShortenAddress';
import useCreateSwap from '../../../hooks/useCreateSwap';
import { useRouter } from 'next/router';
import { GetSourceDestinationData } from '../../../helpers/swapHelper';
import { SwapStatus } from '../../../Models/SwapStatus';

const OnRampSwapConfirmationStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { exchange, network } = swapFormData || {}
    const { exchanges, networks, currencies, discovery: { resource_storage_url } } = useSettingsState()
    const { MainForm } = useCreateSwap()
    const router = useRouter();

    const layerswapApiClient = new LayerSwapApiClient()
    const pending_swaps_endpoint = `/swaps?status=1`
    const { data: allPendingSwaps, mutate, isValidating } = useSWR<ApiResponse<SwapItem[]>>(pending_swaps_endpoint, layerswapApiClient.fetcher, { refreshInterval: 2000 })
    const pendingSwapsToCancel = swapFormData.swapType === SwapType.OnRamp ? allPendingSwaps?.data?.filter(s => s.status === SwapStatus.UserTransferPending && s.source_exchange && exchange?.baseObject?.internal_name === s.source_exchange)
        : allPendingSwaps?.data?.filter(s => s.status === SwapStatus.UserTransferPending && s.source_network && network.baseObject.internal_name === s.source_network)

    const [openCancelConfirmModal, setOpenCancelConfirmModal] = useState(false)
    const [swapToCancel, setSwapToCancel] = useState<SwapItem>()

    useEffect(() => {
        if (exchange && pendingSwapsToCancel && pendingSwapsToCancel.length == 0 && !isValidating)
            MainForm.onNext(swapFormData)
    }, [pendingSwapsToCancel, exchange, swapFormData, allPendingSwaps, isValidating])

    const handleCancelSwap = (swap: SwapItem) => {
        setSwapToCancel(swap)
        setOpenCancelConfirmModal(true)
    }
    const handleCompleteSwap = (swap: SwapItem) => {
        router.push(`/swap/${swap.id}`)
    }

    const sourceName = swapFormData.swapType === SwapType.OnRamp ? swapFormData?.exchange?.baseObject?.display_name : swapFormData?.network?.baseObject?.display_name

    return (
        <Widget>
            <Widget.Content>
                <div className="w-full flex-col justify-between flex h-full mt-4">
                    <div className='text-center mt-5'>
                        <p className='mb-6 mt-2 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                            You have pending swaps for {sourceName}
                        </p>
                        <p className='text-center text-base px-2'>
                            Please either complete them or cancel before creating a new one.
                        </p>
                    </div>
                    {
                        <div className="overflow-hidden mb-4">
                            <div className='flex flex-col space-y-2'>
                                {pendingSwapsToCancel?.map((swap) => {
                                    const { currency, destination, destination_logo, source, source_logo } = GetSourceDestinationData({ swap, currencies, exchanges, networks, resource_storage_url })

                                    return (
                                        <div key={swap.id}>
                                            <div className='w-full rounded-md px-3 py-3 shadow-sm border border-darkblue-500  bg-darkblue-700'>
                                                <div className="flex items-center justify-between w-full space-x-1">
                                                    <div className="flex-shrink-0 h-12 w-12 relative block">
                                                        <Image
                                                            src={destination_logo}
                                                            alt="Exchange Logo"
                                                            height="60"
                                                            width="60"
                                                            layout="responsive"
                                                            className="rounded-md object-contain"
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1 px-4 md:grid md:gap-4">
                                                        <div>
                                                            <p className="truncate text-lg font-medium text-primary-text">{destination?.display_name} <span className='text-gray-500'>{currency?.asset}</span></p>
                                                            <p className="mt-2 flex items-center text-md text-gray-500">
                                                                {shortenAddress(swap.destination_address)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-white text-sm">
                                                        <div className="flex flex-row text-white text-base space-x-2">
                                                            <div className='basis-1/2'>
                                                                <SubmitButton text_align="left" size="medium" buttonStyle="outline" onClick={() => { handleCancelSwap(swap) }} isDisabled={false} isSubmitting={false} icon={<XIcon className='h-5 w-5' />}>
                                                                    <DoubleLineText
                                                                        colorStyle='mltln-text-dark'
                                                                        primaryText='Cancel'
                                                                        secondarytext='the swap'
                                                                        reversed={true}
                                                                    />
                                                                </SubmitButton>
                                                            </div>
                                                            <div className='basis-1/2'>
                                                                <SubmitButton button_align='right' size="medium" text_align="left" onClick={() => { handleCompleteSwap(swap) }} isDisabled={false} isSubmitting={false} icon={<ExternalLinkIcon className='h-5 w-5' />}>
                                                                    <DoubleLineText
                                                                        colorStyle='mltln-text-light'
                                                                        primaryText="Complete"
                                                                        secondarytext='the swap'
                                                                        reversed={true}
                                                                    />
                                                                </SubmitButton>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    }
                </div>
            </Widget.Content>
            <SwapCancelModal swapToCancel={swapToCancel} openCancelConfirmModal={openCancelConfirmModal} setOpenCancelConfirmModal={setOpenCancelConfirmModal} />
        </Widget>
    )
}

type SwapCancelModalProps = {
    swapToCancel: SwapItem;
    openCancelConfirmModal: boolean;
    setOpenCancelConfirmModal: Dispatch<SetStateAction<boolean>>
}

export const SwapCancelModal: FC<SwapCancelModalProps> = ({ swapToCancel, openCancelConfirmModal, setOpenCancelConfirmModal }) => {

    const [loadingSwapCancel, setLoadingSwapCancel] = useState(false)
    const { cancelSwap } = useSwapDataUpdate()

    const handleClose = () => {
        setOpenCancelConfirmModal(false)
    }
    const handleCancelConfirmed = useCallback(async () => {
        setLoadingSwapCancel(true)
        try {
            await cancelSwap(swapToCancel.id)
            // await mutate()
            setOpenCancelConfirmModal(false)
            setLoadingSwapCancel(false)
        }
        catch (e) {
            setLoadingSwapCancel(false)
            toast(e.message)
        }
    }, [swapToCancel])

    return (
        <Modal showModal={openCancelConfirmModal} setShowModal={setOpenCancelConfirmModal} title="Do NOT cancel if you have already sent crypto" modalSize='medium'>
            <div className='text-primary-text mb-4'></div>
            <div className="flex flex-row text-white text-base space-x-2">
                <div className='basis-1/2'>
                    <SubmitButton className='plausible-event-name=Cancel+the+swap' text_align='left' isDisabled={loadingSwapCancel} isSubmitting={loadingSwapCancel} onClick={handleCancelConfirmed} buttonStyle='outline' size="medium" >
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
    )
}

export default OnRampSwapConfirmationStep;
