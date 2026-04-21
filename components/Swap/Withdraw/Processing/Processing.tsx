import LinkWithIcon from '@/components/Common/LinkWithIcon';
import React, { FC, useCallback, useEffect, useMemo, useRef } from 'react'
import { Widget } from '@/components/Widget/Index';
import Steps from '../../StepsComponent';
import SwapSummary from '../../Summary';
import LayerSwapApiClient, { BackendTransactionStatus, TransactionType, TransactionStatus, SwapBasicData, SwapDetails, SwapQuote, Refuel } from '@/lib/apiClients/layerSwapApiClient';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { SwapStatus } from '@/Models/SwapStatus';
import { SwapFailReasons } from '@/Models/RangeError';
import { Gauge } from '@/components/gauge';
import { CircleCheck, Undo2 } from 'lucide-react';
import Failed from '../Failed';
import { ProgressStates, ProgressStatus, StatusStep } from './types';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import CountdownTimer from '@/components/Common/CountDownTimer';
import useSWR from 'swr';
import { ApiResponse } from '@/Models/ApiResponse';
import { useIntercom } from 'react-use-intercom';
import logError from '@/lib/logError';
import { posthog } from 'posthog-js';
import { getExplorerUrl } from '@/lib/address';
import { useResolvedSwapStatus } from '@/hooks/useResolvedSwapStatus';
import { SwapPhase } from '@/components/utils/resolveSwapPhase';

const apiClient = new LayerSwapApiClient();

type Props = {
    swapBasicData: SwapBasicData;
    swapDetails: SwapDetails;
    quote: SwapQuote | undefined;
    refuel: Refuel | undefined;
}

const Processing: FC<Props> = ({ swapBasicData, swapDetails, quote, refuel }) => {
    const { boot, show, update } = useIntercom();
    const setSwapTransaction = useSwapTransactionStore(state => state.setSwapTransaction);
    const storedWalletTransaction = useSwapTransactionStore(
        state => swapDetails?.id ? state.swapTransactions[swapDetails.id] : undefined,
    );

    const {
        source_network,
        destination_network,
        destination_token,
    } = swapBasicData
    const { fail_reason } = swapDetails

    const startIntercom = useCallback(() => {
        boot();
        show();
        update({ customAttributes: { swapId: swapDetails.id } });
    }, [boot, show, update, swapDetails.id]);

    const input_tx_explorer = source_network?.transaction_explorer_template
    const output_tx_explorer = destination_network?.transaction_explorer_template

    const swapInputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Input)

    const transactionHash = swapInputTransaction?.transaction_hash || storedWalletTransaction?.hash
    const swapOutputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Refuel)
    const swapRefundTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Refund)

    const { data: inputTxStatusData } = useSWR<ApiResponse<{ status: TransactionStatus }>>((transactionHash && swapInputTransaction?.status !== BackendTransactionStatus.Completed) ? [source_network?.name, transactionHash] : null, ([network, tx_id]) => apiClient.GetTransactionStatus(network, tx_id as any), { dedupingInterval: 6000 })

    const inputTxStatusFromApi = inputTxStatusData?.data?.status?.toLowerCase() as TransactionStatus | undefined
    const resolved = useResolvedSwapStatus({ inputTxStatusFromApi })
    const { stepStatuses, generalStatus, phase, swapInputTxStatus, isRefundFlow, hidesSteps, showsFailedPanel, showsEstimatedTime } = resolved

    const loggedNotDetectedTxAt = useRef<number | null>(null);

    useEffect(() => {
        if (swapInputTxStatus === TransactionStatus.Completed || swapInputTxStatus === TransactionStatus.Pending) {
            if (!swapDetails || swapDetails.transactions?.find(t => t.type === TransactionType.Input)) {
                return
            }
            const fallback = storedWalletTransaction?.timestamp ?? Date.now();
            if (Date.now() - (loggedNotDetectedTxAt.current ?? fallback) > 60000) {
                loggedNotDetectedTxAt.current = Date.now();
                logError(`Transaction not detected in ${source_network.name}. Tx hash: \`${transactionHash}\`. Tx status: ${swapInputTxStatus}. Swap id: \`${swapDetails.id}\`. ${source_network.display_name} explorer: ${getExplorerUrl(source_network?.transaction_explorer_template, transactionHash)} . LS explorer: https://layerswap.io/explorer/${storedWalletTransaction?.hash} `);
            }
        }
    }, [swapDetails, storedWalletTransaction, source_network, swapInputTxStatus, transactionHash]);

    useEffect(() => {
        if (!swapDetails?.id) return
        if (storedWalletTransaction?.status !== swapInputTxStatus) setSwapTransaction(swapDetails.id, swapInputTxStatus, storedWalletTransaction?.hash ?? '')
    }, [swapInputTxStatus, storedWalletTransaction?.hash, storedWalletTransaction?.status, swapDetails?.id, setSwapTransaction])

    useEffect(() => {
        if (swapInputTxStatus === TransactionStatus.Failed) {
            const err = new Error("Transaction failed")
            posthog.captureException(err, {
                $layerswap_exception_type: "Transaction Error",
                $fromAddress: swapInputTransaction?.from,
                transactionHash: transactionHash,
                swapId: swapDetails?.id,
                $toAddress: swapBasicData?.destination_address
            });
        }
    }, [swapInputTxStatus, transactionHash, swapDetails?.id, swapInputTransaction?.from, swapBasicData?.destination_address])

    useEffect(() => {
        if (
            swapDetails?.status === SwapStatus.Completed ||
            swapDetails?.status === SwapStatus.Failed ||
            swapDetails?.status === SwapStatus.Expired ||
            swapDetails?.status === SwapStatus.LsTransferPending
        ) {
            posthog?.capture(`${swapDetails?.status}`, {
                swap_id: swapDetails?.id,
                status: swapDetails?.status,
            })
        }
    }, [swapDetails?.status, swapDetails?.id])

    const truncatedRefuelAmount = refuel && truncateDecimals(refuel.amount, refuel.token?.precision)

    const progressStates = useMemo<ProgressStates>(() => ({
        "input_transfer": {
            upcoming: {
                name: 'Waiting for your transfer',
                description: null
            },
            current: {
                name: 'Processing your deposit',
                description: <div className='flex space-x-1'>
                    <div>
                        <LinkWithIcon
                            name={'View in explorer'}
                            url={getExplorerUrl(input_tx_explorer, transactionHash)}
                        />
                    </div>
                    <div>
                        <span>
                            {swapInputTransaction && swapInputTransaction?.confirmations > 0 && (
                                <div>
                                    <span className='whitespace-nowrap'>| Confirmations </span>
                                    <span className="text-primary-text ml-1">
                                        <span>{swapInputTransaction?.confirmations >= swapInputTransaction?.max_confirmations
                                            ? swapInputTransaction?.max_confirmations
                                            : swapInputTransaction?.confirmations}</span>
                                        <span>/</span>{swapInputTransaction?.max_confirmations}
                                    </span>
                                </div>
                            )}
                        </span>
                    </div>
                </div>
            },
            complete: {
                name: `Deposit confirmed`,
                description: <div>
                    <span>We&apos;ve received your deposit.</span>{' '}
                    <LinkWithIcon
                        name={'View in explorer'}
                        url={getExplorerUrl(input_tx_explorer, transactionHash)}
                    />
                </div>
            },
            failed: {
                name: `The transfer failed`,
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-primary-text'>
                        {swapInputTxStatus === TransactionStatus.Failed ?
                            <div className="flex flex-col">
                                <p>Check the transfer in the explorer</p>
                                <LinkWithIcon
                                    name={'View in explorer'}
                                    url={getExplorerUrl(input_tx_explorer, transactionHash)}
                                />
                            </div>
                            :
                            fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ?
                                "Your deposit is higher than the max limit. We'll review and approve your transaction in up to 2 hours."
                                :
                                fail_reason == SwapFailReasons.RECEIVED_LESS_THAN_VALID_RANGE ?
                                    "Your deposit is lower than the minimum required amount. Unfortunately, we can't process the transaction. Please contact support to check if you're eligible for a refund."
                                    :
                                    <div><span className='text-secondary-text'>Something went wrong while processing the transfer.</span> <a className='underline hover:cursor-pointer text-secondary-text' onClick={() => startIntercom()}> please contact our support.</a></div>
                        }
                    </div>
                </div>
            },
            delayed: {
                name: `This transfer is being delayed by Coinbase`,
                description: null
            }
        },
        "output_transfer": {
            upcoming: {
                name: `Sending ${destination_token.symbol} to your address`,
                description: null
            },
            current: {
                name: `Sending ${destination_token.symbol} to your address`,
                description: null
            },
            complete: {
                name: `${swapOutputTransaction?.amount && truncateDecimals(swapOutputTransaction?.amount, destination_token.decimals)} ${destination_token.symbol} was sent to your address`,
                description: swapOutputTransaction?.amount ? <div className="flex flex-col">
                    <div>
                        <span>Transaction: </span>{' '}
                        <LinkWithIcon
                            name={'View in explorer'}
                            url={getExplorerUrl(output_tx_explorer, swapOutputTransaction?.transaction_hash)}
                        />
                    </div>
                </div> : null,
            },
            failed: {
                name: (swapDetails.status === SwapStatus.PendingRefund || swapDetails.status === SwapStatus.Refunded)
                    ? "Processing Failed"
                    : fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE
                        ? `The transfer is on hold`
                        : "The transfer has failed",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-secondary-text'>
                        {
                            swapDetails.status === SwapStatus.PendingRefund || swapDetails.status === SwapStatus.Refunded ?
                                "There was an issue completing the transfer. We're refunding your deposit." :
                                fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ?
                                    "Your deposit is higher than the max limit. We'll review and approve your transaction in up to 2 hours."
                                    :
                                    fail_reason == SwapFailReasons.RECEIVED_LESS_THAN_VALID_RANGE ?
                                        "Your deposit is lower than the minimum required amount. Unfortunately, we can't process the transaction. Please contact support to check if you're eligible for a refund."
                                        :
                                        <div><span className='text-secondary-text'>Something went wrong while processing the transfer.</span> <a className='underline hover:cursor-pointer text-secondary-text' onClick={() => startIntercom()}> please contact our support.</a></div>
                        }
                    </div>
                </div>
            },
            delayed: {
                name: `This swap is being delayed by Coinbase`,
                description: null
            }
        },
        "refuel": {
            upcoming: {
                name: `Sending ${refuel?.token?.symbol} to your address`,
                description: null
            },
            current: {
                name: `Sending ${refuel?.token?.symbol} to your address`,
                description: null
            },
            complete: {
                name: `${truncatedRefuelAmount} ${refuel?.token?.symbol} was sent to your address`,
                description: <div>
                    <span>Transaction: </span>{' '}
                    {swapRefuelTransaction &&
                        <LinkWithIcon
                            name={'View in explorer'}
                            url={getExplorerUrl(output_tx_explorer, swapRefuelTransaction?.transaction_hash)}
                        />
                    }
                </div>
            },
            delayed: {
                name: `This transfers is being delayed`,
                description: null
            }
        },
        "refund": {
            upcoming: {
                name: 'Refund Pending',
                description: null
            },
            current: {
                name: 'Refund Pending',
                description: <div className='text-secondary-text'>
                    Your refund is being processed.
                </div>
            },
            complete: {
                name: 'Refund sent',
                description: <div className='text-secondary-text'>
                    <span>The full deposit amount has been sent back to your wallet.</span>{' '}
                    {
                        swapRefundTransaction && (
                            <LinkWithIcon
                                name={'View in explorer'}
                                url={getExplorerUrl(input_tx_explorer, swapRefundTransaction?.transaction_hash || '')}
                            />
                        )}
                </div>
            },
            failed: {
                name: 'Refund Failed',
                description: <div className='space-x-1 text-secondary-text'>
                    <span>Something went wrong while processing the refund.</span> <a className='underline hover:cursor-pointer text-secondary-text' onClick={() => startIntercom()}> please contact our support.</a>
                </div>
            }
        }
    }), [
        input_tx_explorer,
        output_tx_explorer,
        transactionHash,
        swapInputTransaction,
        swapOutputTransaction,
        swapRefuelTransaction,
        swapRefundTransaction,
        destination_token.symbol,
        destination_token.decimals,
        refuel?.token?.symbol,
        truncatedRefuelAmount,
        fail_reason,
        swapDetails.status,
        swapInputTxStatus,
        startIntercom,
    ]);

    const { currentSteps, stepsProgressPercentage } = useMemo(() => {
        const allSteps: StatusStep[] = [
            {
                name: progressStates.input_transfer?.[stepStatuses.input_transfer]?.name,
                status: stepStatuses.input_transfer,
                description: progressStates.input_transfer?.[stepStatuses.input_transfer]?.description,
                index: 1
            },
            {
                name: progressStates.output_transfer?.[stepStatuses.output_transfer]?.name,
                status: stepStatuses.output_transfer,
                description: progressStates.output_transfer?.[stepStatuses.output_transfer]?.description,
                index: 2
            },
            {
                name: progressStates.refuel?.[stepStatuses.refuel]?.name,
                status: stepStatuses.refuel,
                description: progressStates.refuel?.[stepStatuses.refuel]?.description,
                index: 3
            },
            {
                name: progressStates.refund?.[stepStatuses.refund]?.name,
                status: stepStatuses.refund,
                description: progressStates.refund?.[stepStatuses.refund]?.description,
                index: 4
            }
        ];
        const current = allSteps.filter(s => s.status && s.status !== ProgressStatus.Removed);
        let completed = 0;
        for (const s of current) if (s.status === ProgressStatus.Complete) completed++;
        const percentage = current.length ? (completed / current.length) * 100 : 0;
        return { currentSteps: current, stepsProgressPercentage: percentage };
    }, [progressStates, stepStatuses]);

    return (
        <Widget.Content fitContent>
            <div className={`w-full min-h-102.5 h-full space-y-3 flex flex-col justify-between text-primary-text`}>
                <SwapSummary />
                <div className="bg-secondary-500 font-normal px-3 pt-6 pb-3 rounded-2xl space-y-4 flex flex-col w-full relative z-10 divide-y-2 divide-secondary-300 divide-dashed">
                    <div className='pb-4'>
                        <div className='flex flex-col gap-2 items-center'>
                            <div className='flex items-center'>
                                {phase === SwapPhase.PendingRefund && (
                                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                                        <Undo2 className="h-7 w-7 text-primary" aria-hidden="true" />
                                    </span>
                                )}

                                {phase === SwapPhase.Refunded && (
                                    <span className="relative z-10 flex h-10 w-10 items-center justify-center">
                                        <CircleCheck className="h-10 w-10 text-primary" strokeWidth={2} aria-hidden="true" />
                                    </span>
                                )}

                                {!isRefundFlow && (
                                    <Gauge
                                        value={stepsProgressPercentage}
                                        size="small"
                                        showCheckmark={stepsProgressPercentage == 100}
                                    />
                                )}
                            </div>
                            <div className="flex-col text-center">
                                <span className="font-medium text-primary-text">
                                    {generalStatus.title}
                                </span>
                                {
                                    generalStatus.subTitle &&
                                    <span className="text-sm block text-secondary-text">
                                        {generalStatus.subTitle}
                                    </span>
                                }
                                {showsEstimatedTime &&
                                    <span className='text-sm block space-x-1 text-secondary-text'>
                                        <span>
                                            {
                                                quote?.avg_completion_time ? <div className='text-primary-text'>
                                                    <CountdownTimer
                                                        initialTime={String(quote?.avg_completion_time)}
                                                        swapDetails={swapDetails}
                                                    />
                                                </div> : null
                                            }
                                        </span>
                                    </span>
                                }
                            </div>
                        </div>
                    </div>
                    <div className='pt-4'>
                        {
                            !hidesSteps && currentSteps.length > 0 &&
                            <div className='flex flex-col justify-center space-y-4'>
                                <Steps steps={currentSteps} />
                            </div>
                        }
                        {
                            showsFailedPanel &&
                            <Failed />
                        }
                    </div>
                </div>
            </div>
        </Widget.Content>
    )
}

export default Processing;
