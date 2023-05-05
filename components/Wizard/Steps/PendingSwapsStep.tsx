import { ArrowRight, ExternalLink, X } from 'lucide-react';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import toast from 'react-hot-toast';
import Widget from '../Widget';
import LayerSwapApiClient, { SwapItem } from '../../../lib/layerSwapApiClient';
import Image from 'next/image'
import useSWR from 'swr';
import { ApiResponse } from '../../../Models/ApiResponse';
import { useSettingsState } from '../../../context/settings';
import shortenAddress from '../../utils/ShortenAddress';
import { useRouter } from 'next/router';
import useCreateSwap from '../../../hooks/useCreateSwap';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { AuthStep } from '../../../Models/Wizard';
import Modal from '../../modal/modal';
import WarningMessage from '../../WarningMessage';

export const CurrencyPendingSwapStep: FC = () => {
    const { swapFormData, swap } = useSwapDataState()
    const { MainForm } = useCreateSwap()

    const layerswapApiClient = new LayerSwapApiClient()
    const pending_swaps_endpoint = `/swaps?status=0`
    const { data: allPendingSwaps, isValidating, mutate } = useSWR<ApiResponse<SwapItem[]>>(pending_swaps_endpoint, layerswapApiClient.fetcher)
    const pendingSwapsToCancel = allPendingSwaps?.data?.filter(s => s.source_network_asset?.toLowerCase() === swapFormData?.currency?.asset?.toLowerCase())

    useEffect(() => {
        if (pendingSwapsToCancel && pendingSwapsToCancel.length == 0 && !isValidating)
            MainForm.onNext({ values: swapFormData, seapId: swap?.id })
    }, [pendingSwapsToCancel, swapFormData, allPendingSwaps, isValidating, swap])

    useEffect(() => {
        mutate()
    }, [])

    const handleCancel = useCallback(() => {
        mutate()
    }, [mutate])

    return (
        <Widget>
            <Widget.Content>
                <PendingSwapsComponent loading={isValidating} onCancel={handleCancel} pendingSwapsToCancel={pendingSwapsToCancel} header='You have pending swaps' description='Please either complete them or cancel before creating a new one.' />
            </Widget.Content>
        </Widget>
    )
}

export const AllPendingSwapStep: FC = () => {
    const { swap } = useSwapDataState()
    const { goToStep } = useFormWizardaUpdate()
    const layerswapApiClient = new LayerSwapApiClient()
    const pending_swaps_endpoint = `/swaps?status=0`
    const { data: allPendingSwaps, mutate, isValidating } = useSWR<ApiResponse<SwapItem[]>>(pending_swaps_endpoint, layerswapApiClient.fetcher)
    const pendingSwapsToCancel = allPendingSwaps?.data

    useEffect(() => {
        mutate()
    }, [])

    useEffect(() => {
        if (pendingSwapsToCancel && pendingSwapsToCancel.length == 0 && !isValidating)
            goToStep(AuthStep.Email)
    }, [pendingSwapsToCancel, isValidating, swap])

    const handleCancel = useCallback(() => {
        mutate()
    }, [mutate])

    return (
        <Widget>
            <Widget.Content>
                {
                    <PendingSwapsComponent loading={isValidating} onCancel={handleCancel} pendingSwapsToCancel={pendingSwapsToCancel} header='Your pending swaps will be lost' description='If you’ve already done a transfer for these swaps, wait till the completion.' />
                }
            </Widget.Content>
        </Widget>
    )
}

type PendingSwapsComponentProps = {
    pendingSwapsToCancel: SwapItem[];
    header: string;
    description: string;
    onCancel: () => void;
    loading: boolean;
}

export const PendingSwapsComponent: FC<PendingSwapsComponentProps> = ({ pendingSwapsToCancel, header, description, onCancel, loading }) => {
    const { layers, resolveImgSrc } = useSettingsState()
    const [openCancelConfirmModal, setOpenCancelConfirmModal] = useState(false)
    const [swapToCancel, setSwapToCancel] = useState<SwapItem>()
    const router = useRouter();

    const handleCancelSwap = (swap: SwapItem) => {
        setSwapToCancel(swap)
        setOpenCancelConfirmModal(true)
    }

    const handleCompleteSwap = (swap: SwapItem) => {
        router.push(`/swap/${swap.id}`)
    }

    return (
        <div className="w-full flex-col space-y-4 flex h-full text-primary-text mt-6">
            <div className='text-center'>
                <p className='mb-6 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                    {header}
                </p>
                <p className='text-center text-base'>
                    {description}
                </p>
            </div>
            {
                <div className="overflow-hidden mb-4">
                    <div className={`flex flex-col space-y-2 ${loading && 'animate-pulse'}`}>
                        {pendingSwapsToCancel?.map((swap) => {

                            const { source_exchange: source_exchange_internal_name,
                                destination_network: destination_network_internal_name,
                                source_network: source_network_internal_name,
                                destination_exchange: destination_exchange_internal_name,
                                destination_network_asset
                            } = swap

                            const source_internal_name = source_exchange_internal_name || source_network_internal_name
                            const destination_internal_name = destination_exchange_internal_name || destination_network_internal_name
                            const source = layers.find(e => e.internal_name === source_internal_name)
                            const destination = layers.find(e => e.internal_name === destination_internal_name)

                            return (
                                <div key={swap.id}>
                                    <div className='w-full mb-2 rounded-md px-3 py-3 shadow-sm border border-darkblue-500  bg-darkblue-700'>
                                        <div className="items-center justify-between w-full space-y-2">
                                            <div className="items-center flex w-full md:space-x-3 py-1.5 text-left text-base font-medium">
                                                <div className='space-y-1.5 md:space-y-1 grow'>
                                                    <div className='text-md  items-center space-x-3'>
                                                        <div className='flex justify-between text-white'>
                                                            <p className='text-sm md:text-base flex items-center'>Waiting for {source?.display_name} withdrawal</p>
                                                            <div className='md:flex hidden space-x-1 items-center'>
                                                                <p className='flex font-normal text-white'>{swap?.requested_amount} <span className='text-primary-text ml-1'>{swap?.destination_network_asset}</span></p>
                                                                <div className="h-5 w-5 relative">
                                                                    <Image
                                                                        src={resolveImgSrc({ asset: destination_network_asset })}
                                                                        alt="Source Logo"
                                                                        height="60"
                                                                        width="60"
                                                                        className="rounded-md object-contain"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className='flex justify-between space-x-4 items-center'>
                                                        <div className='flex rounded-md items-center text-xs space-x-2'>
                                                            <div className='flex space-x-1 items-center'>
                                                                <div className="h-5 w-5 relative">
                                                                    {
                                                                        <Image
                                                                            src={resolveImgSrc(source)}
                                                                            alt="Source Logo"
                                                                            height="60"
                                                                            width="60"
                                                                            className="rounded-md object-contain"
                                                                        />
                                                                    }
                                                                </div>
                                                                <p className='font-normal md:font-medium'>{source?.display_name}</p>
                                                            </div>
                                                            <ArrowRight className='h-3 w-3 text-primary-text' />
                                                            <div className='flex space-x-1 items-center'>
                                                                <div className="h-5 w-5 relative">
                                                                    {
                                                                        <Image
                                                                            src={resolveImgSrc(destination)}
                                                                            alt="Source Logo"
                                                                            height="60"
                                                                            width="60"
                                                                            className="rounded-md object-contain"
                                                                        />
                                                                    }
                                                                </div>
                                                                <p className='font-normal md:font-medium'>{destination?.display_name}</p>
                                                            </div>
                                                        </div>
                                                        <div className='text-xs text-right'>
                                                            <span className='hidden md:block'>{shortenAddress(swap?.destination_address)}</span>
                                                            <div className='flex md:hidden space-x-1 items-center'>
                                                                <p className='md:hidden flex font-normal text-white'>{swap?.requested_amount} <span className='text-primary-text ml-1'>{swap?.destination_network_asset}</span></p>
                                                                <div className="h-5 w-5 relative">
                                                                    <Image
                                                                        src={resolveImgSrc({ asset: destination_network_asset })}
                                                                        alt="Source Logo"
                                                                        height="60"
                                                                        width="60"
                                                                        className="rounded-md object-contain"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-white text-sm md:text-base">
                                                <div className="flex flex-row text-white space-x-2">
                                                    <div className='basis-1/3'>
                                                        <SubmitButton text_align="left" size="medium" buttonStyle="outline" onClick={() => { handleCancelSwap(swap) }} isDisabled={false} isSubmitting={false} icon={<X className='md:h-5 h-3' />}>
                                                            <DoubleLineText
                                                                colorStyle='mltln-text-dark'
                                                                primaryText='Cancel'
                                                                secondarytext='the swap'
                                                                reversed={true}
                                                            />
                                                        </SubmitButton>
                                                    </div>
                                                    <div className='basis-2/3'>
                                                        <SubmitButton button_align='right' size="medium" text_align="left" onClick={() => { handleCompleteSwap(swap) }} isDisabled={false} isSubmitting={false} icon={<ExternalLink className='md:h-5 h-3' />}>
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
            <SwapCancelModal onCancel={onCancel} swapToCancel={swapToCancel} openCancelConfirmModal={openCancelConfirmModal} setOpenCancelConfirmModal={setOpenCancelConfirmModal} />
        </div>
    )
}

type SwapCancelModalProps = {
    swapToCancel: SwapItem;
    openCancelConfirmModal: boolean;
    setOpenCancelConfirmModal: Dispatch<SetStateAction<boolean>>;
    onCancel?: () => void;
}

export const SwapCancelModal: FC<SwapCancelModalProps> = ({ swapToCancel, openCancelConfirmModal, setOpenCancelConfirmModal, onCancel }) => {

    const [loadingSwapCancel, setLoadingSwapCancel] = useState(false)
    const { cancelSwap } = useSwapDataUpdate()

    const handleClose = () => {
        setOpenCancelConfirmModal(false)
    }
    const handleCancelConfirmed = useCallback(async () => {
        setLoadingSwapCancel(true)
        try {
            await cancelSwap(swapToCancel.id)
            setOpenCancelConfirmModal(false)
            setLoadingSwapCancel(false)
            onCancel && onCancel()
        }
        catch (e) {
            setLoadingSwapCancel(false)
            toast(e.message)
        }
    }, [swapToCancel])

    return (
        <Modal show={openCancelConfirmModal} setShow={setOpenCancelConfirmModal} height='fit' header="Caution">
            <WarningMessage className='mb-8 mt-4'>Do NOT cancel if you have already sent crypto</WarningMessage>
            <div className='text-primary-text mb-4'>
                <div className="flex flex-row text-white text-base space-x-2">
                    <div className='basis-1/2'>
                        <SubmitButton className='plausible-event-name=Swap+canceled' text_align='left' isDisabled={loadingSwapCancel} isSubmitting={loadingSwapCancel} onClick={handleCancelConfirmed} buttonStyle='outline' size="medium" >
                            Cancel the swap
                        </SubmitButton>
                    </div>
                    <div className='basis-1/2'>
                        <SubmitButton button_align='right' text_align='left' isDisabled={loadingSwapCancel} isSubmitting={false} onClick={handleClose} size='medium'>
                            Don't cancel
                        </SubmitButton>
                    </div>
                </div>
            </div>
        </Modal>
    )
}