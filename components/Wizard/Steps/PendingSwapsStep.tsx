import { ExternalLinkIcon, PencilAltIcon, XIcon } from '@heroicons/react/outline';
import { ExclamationIcon, CalendarIcon } from '@heroicons/react/outline';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { SwapCreateStep } from '../../../Models/Wizard';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import toast from 'react-hot-toast';
import ToggleButton from '../../buttons/toggleButton';
import { isValidAddress } from '../../../lib/addressValidator';
import AddressDetails from '../../DisclosureComponents/AddressDetails';
import { FormikProps } from 'formik';
import { nameOf } from '../../../lib/external/nameof';
import SwapConfirmMainData from '../../Common/SwapConfirmMainData';
import { SwapConfirmationFormValues } from '../../DTOs/SwapConfirmationFormValues';
import { ApiError, KnownwErrorCode } from '../../../Models/ApiError';
import Modal from '../../modalComponent';
import { useTimerState } from '../../../context/timerContext';
import Widget from '../Widget';
import WarningMessage from '../../WarningMessage';
import SwapSettings from '../../../lib/SwapSettings';
import { CalculateMinimalAuthorizeAmount } from '../../../lib/fees';
import SwapDetails from '../../swapDetailsComponent';
import TokenService from '../../../lib/TokenService';
import LayerSwapApiClient, { SwapItem, SwapType } from '../../../lib/layerSwapApiClient';
import Image from 'next/image'
import useSWR from 'swr';
import { ApiResponse } from '../../../Models/ApiResponse';
import { useSettingsState } from '../../../context/settings';
import BackgroundField from '../../backgroundField';
import FormattedDate from '../../Common/FormattedDate';
import shortenAddress from '../../utils/ShortenAddress';

const TIMER_SECONDS = 120

const OnRampSwapConfirmationStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { exchange } = swapFormData || {}
    const { cancelSwap } = useSwapDataUpdate()

    const layerswapApiClient = new LayerSwapApiClient()
    const pending_swaps_endpoint = `/swaps?status=1`
    const { data: pendingSwaps } = useSWR<ApiResponse<SwapItem[]>>(pending_swaps_endpoint, layerswapApiClient.fetcher)
    const exchangePendingSwaps = pendingSwaps?.data?.filter(s => s.type == SwapType.OnRamp && exchange.baseObject.currencies.some(ec => ec.id === s.exchange_currency_id))

    const [openCancelConfirmModal, setOpenCancelConfirmModal] = useState(false)
    const [loadingSwapCancel, setLoadingSwapCancel] = useState(false)
    const [swapToCancel, setSwapToCancel] = useState<SwapItem>()

    const handleClose = () => {
        setOpenCancelConfirmModal(false)
    }
    const handleCancelConfirmed = useCallback(async () => {
        setLoadingSwapCancel(true)
        try {
            await cancelSwap(swapToCancel.id)
            setLoadingSwapCancel(false)
        }
        catch (e) {
            setLoadingSwapCancel(false)
            toast(e.message)
        }
    }, [setSwapToCancel])
    return (
        <Widget>
            <Widget.Content>
                <div className="w-full flex-col justify-between flex h-full mt-4">
                    <div className='text-center mt-5'>
                        <p className='mb-6 mt-2 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                            You have pending swaps for {swapFormData?.exchange?.baseObject?.display_name}
                        </p>
                        <p className='text-center text-base px-2'>
                            Please either complete them or cancel before creating a new one.
                        </p>
                    </div>
                </div>
                {
                    exchangePendingSwaps?.length > 0 && <PendingSwapsComponenent swaps={exchangePendingSwaps} />
                }
            </Widget.Content>
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
        </Widget>
    )
}

const PendingSwapsComponenent = ({ swaps }: { swaps: SwapItem[] }) => {
    const { exchanges, networks, currencies, discovery: { resource_storage_url } } = useSettingsState()
    return (
        <div className="overflow-hidden mb-4">
            <div className='flex flex-col space-y-2'>
                {swaps.map((swap) => {
                    const network = networks?.find(n => n.currencies.some(nc => nc.id === swap?.network_currency_id))
                    const currencyDetails = network?.currencies?.find(x => x.id == swap?.network_currency_id)
                    return (
                        <div key={swap.id}>
                            <div className='w-full rounded-md px-3 py-3 shadow-sm border border-darkblue-500  bg-darkblue-700'>
                                <div className="flex items-center justify-between w-full space-x-1">
                                    <div className="flex-shrink-0 h-12 w-12 relative block">
                                        <Image
                                            src={`${resource_storage_url}${network?.logo}`}
                                            alt="Exchange Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1 px-4 md:grid md:gap-4">
                                        <div>
                                            <p className="truncate text-lg font-medium text-primary-text">{network.display_name} <span className='text-gray-500'>{swap.requested_amount} {currencyDetails?.asset}</span></p>
                                            <p className="mt-2 flex items-center text-md text-gray-500">
                                                {shortenAddress(swap.destination_address)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-white text-sm">
                                        <div className="flex flex-row text-white text-base space-x-2">
                                            <div className='basis-1/2'>
                                                <SubmitButton text_align="left" size="medium" buttonStyle="outline" onClick={async () => { }} isDisabled={false} isSubmitting={false} icon={<XIcon className='h-5 w-5' />}>
                                                    <DoubleLineText
                                                        colorStyle='mltln-text-dark'
                                                        primaryText='Cancel'
                                                        secondarytext='the swap'
                                                        reversed={true}
                                                    />
                                                </SubmitButton>
                                            </div>
                                            <div className='basis-1/2'>
                                                <SubmitButton button_align='right' size="medium" text_align="left" onClick={() => { }} isDisabled={false} isSubmitting={false} icon={<ExternalLinkIcon className='h-5 w-5' />}>
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
    )
}

export default OnRampSwapConfirmationStep;
