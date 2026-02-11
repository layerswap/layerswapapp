import { FC, useState } from 'react'
import { SwapResponse, TransactionType } from '@/lib/apiClients/layerSwapApiClient';
import CopyButton from '@/components/Buttons/copyButton';
import StatusIcon from './StatusIcons';
import { ExternalLink } from 'lucide-react';
import isGuid from '@/components/utils/isGuid';
import KnownInternalNames from '@/lib/knownIds';
import { useInitialSettings } from '@/context/settings';
import { SwapStatus } from '@/Models/SwapStatus';
import { getDateDifferenceString } from '@/components/utils/dateDifference';
import { useSwapDataUpdate } from '@/context/swap';
import { useSettingsState } from '@/context/settings';
import { generateSwapInitialValuesFromSwap } from '@/lib/generateSwapInitialValues';
import SubmitButton from '@/components/Buttons/submitButton';
import SecondaryButton from '@/components/Buttons/secondaryButton';
import shortenString from '@/components/utils/ShortenString';
import { getExplorerUrl } from '@/lib/address/explorerUrl';

type Props = {
    swapResponse: SwapResponse
}

const SwapDetails: FC<Props> = ({ swapResponse }) => {

    const { swap } = swapResponse
    const { source_network, destination_network, source_exchange, destination_exchange } = swap

    const initialSettings = useInitialSettings()

    const { setSubmitedFormValues, setSwapModalOpen, setSwapId, createSwap } = useSwapDataUpdate()
    const settings = useSettingsState()
    const [isRepeatLoading, setIsRepeatLoading] = useState(false)

    const handleRepeatSwap = async () => {
        if (isRepeatLoading) return

        setIsRepeatLoading(true)
        try {
            // Create a new swap based on the current swap data
            // Determine if this is a cross-chain or exchange swap
            const swapType = (source_exchange || destination_exchange) ? 'exchange' : 'cross-chain'
            const newSwapData = generateSwapInitialValuesFromSwap({
                ...swap,
                requested_amount: swap.requested_amount.toString()
            }, false, settings, swapType)
            setSubmitedFormValues(newSwapData)

            // For wallet deposits, follow the same flow as FormWrapper's handleCreateSwap
            if (newSwapData.depositMethod === 'wallet') {
                setSwapId(undefined)
                setSwapModalOpen(true)
            } else {
                // For deposit address method, create the swap first then open modal
                setSwapId(undefined)
                const swapResponse = await createSwap(newSwapData, initialSettings, undefined)
                setSwapId(swapResponse.swap.id)
                setSwapModalOpen(true)
            }
        } catch (error) {
            // Handle error appropriately
            console.log('Failed to create swap:', error)
        } finally {
            setIsRepeatLoading(false)
        }
    }

    const handleViewCompleteSwap = () => {
        setSwapId(swap.id)
        setSwapModalOpen(true)
    }

    const input_tx_explorer_template = source_network?.transaction_explorer_template
    const output_tx_explorer_template = destination_network?.transaction_explorer_template

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const refundTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refund)

    return (
        <>
            {/* Swap */}
            <section className='pb-3 space-y-3'>
                <div className='py-3 bg-secondary-500 rounded-xl'>
                    <div className='text-sm flex flex-col gap-3'>
                        <div className="flex justify-between items-center text-sm text-primary-text">
                            <p className="text-left text-secondary-text">ID</p>
                            <CopyButton toCopy={swap?.id} iconClassName='order-2 ml-1 text-primary-text'>
                                {shortenString(swap?.id)}
                            </CopyButton>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left text-secondary-text">Date & Time</span>
                            <span className='text-primary-text'>{(new Date(swap.created_date)).toLocaleString()} <span className='text-primary-text-tertiary'>{getDateDifferenceString(new Date(swap.created_date))}</span></span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left text-secondary-text">Status</span>
                            <StatusIcon swap={swap} />
                        </div>
                    </div>
                </div>
            </section>

            <section className='pb-2'>
                <div className='flex flex-col justify-between w-full h-full gap-3'>
                    <div className='space-y-3'>

                        {/* Source and Destination Transactions */}
                        <div className='py-3 bg-secondary-500 rounded-xl text-primary-text'>
                            <div className='text-sm flex flex-col gap-3'>
                                <div className="flex justify-between items-baseline">
                                    <p className="text-left text-secondary-text">Source transaction</p>
                                    {
                                        swapInputTransaction?.transaction_hash ?
                                            <a
                                                target="_blank"
                                                href={getExplorerUrl(input_tx_explorer_template, swapInputTransaction.transaction_hash)}
                                                className='flex items-center space-x-1'
                                                rel="noopener noreferrer"
                                            >
                                                <span>{shortenString(swapInputTransaction.transaction_hash)}</span>
                                                <ExternalLink className='h-4' />
                                            </a>
                                            :
                                            <span>-</span>
                                    }
                                </div >
                                <div className="flex justify-between items-baseline">
                                    {
                                        swap.status == SwapStatus.Refunded ?
                                            <>
                                                <p className="text-left text-secondary-text">Refund transaction</p>
                                                {
                                                    refundTransaction?.transaction_hash ?
                                                        (
                                                            (refundTransaction?.transaction_hash && swap?.destination_exchange?.name === KnownInternalNames.Exchanges.Coinbase && (isGuid(refundTransaction?.transaction_hash))) ?
                                                                <span><CopyButton toCopy={refundTransaction.transaction_hash} iconClassName="text-primary-text order-2">{shortenString(refundTransaction.transaction_hash)}</CopyButton></span>
                                                                :
                                                                <a
                                                                    target="_blank"
                                                                    href={getExplorerUrl(output_tx_explorer_template, refundTransaction.transaction_hash)}
                                                                    className='flex items-center space-x-1'
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <span>{shortenString(refundTransaction.transaction_hash)}</span>
                                                                    <ExternalLink className='h-4' />
                                                                </a>
                                                        )
                                                        :
                                                        <span>-</span>
                                                }
                                            </>
                                            :
                                            <>
                                                <p className="text-left text-secondary-text">Destination transaction</p>
                                                {
                                                    swapOutputTransaction?.transaction_hash ?
                                                        (
                                                            (swapOutputTransaction?.transaction_hash && swap?.destination_exchange?.name === KnownInternalNames.Exchanges.Coinbase && (isGuid(swapOutputTransaction?.transaction_hash))) ?
                                                                <span><CopyButton toCopy={swapOutputTransaction.transaction_hash} iconClassName="text-primary-text order-2">{shortenString(swapOutputTransaction.transaction_hash)}</CopyButton></span>
                                                                :
                                                                <a
                                                                    target="_blank"
                                                                    href={getExplorerUrl(output_tx_explorer_template, swapOutputTransaction.transaction_hash)}
                                                                    className='flex items-center space-x-1'
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <span>{shortenString(swapOutputTransaction.transaction_hash)}</span>
                                                                    <ExternalLink className='h-4' />
                                                                </a>
                                                        )
                                                        :
                                                        <span>-</span>
                                                }
                                            </>
                                    }
                                </div >
                            </div>
                        </div>
                    </div>
                    {
                        swap.status === SwapStatus.Completed &&
                        <SecondaryButton
                            type='button'
                            size='xl'
                            onClick={handleRepeatSwap}
                            isLoading={isRepeatLoading}
                            className='bg-secondary-100! rounded-xl'
                        >
                            <p className='text-primary-text'>
                                {isRepeatLoading ? 'Creating Swap...' : 'Repeat Swap'}
                            </p>
                        </SecondaryButton>
                    }
                    {
                        (swap.status !== SwapStatus.Completed && swap.status !== SwapStatus.Expired && swap.status !== SwapStatus.Failed) &&
                        <SubmitButton
                            type='button'
                            onClick={handleViewCompleteSwap}
                        >
                            <p>
                                {swap.status == SwapStatus.LsTransferPending || swapInputTransaction ? "View Swap" : "Complete Swap"}
                            </p>
                        </SubmitButton>
                    }
                </div>
            </section>
        </>
    )
}
export default SwapDetails;
