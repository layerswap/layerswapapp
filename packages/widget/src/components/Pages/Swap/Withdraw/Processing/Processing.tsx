'use client'
import LinkWithIcon from '@/components/Common/LinkWithIcon';
import { FC, useCallback, useEffect, useRef } from 'react'
import { Widget } from '@/components/Widget/Index';
import SwapSummary from '../Summary';
import LayerSwapApiClient, { BackendTransactionStatus, TransactionType, TransactionStatus, Transaction, SwapBasicData, SwapDetails, SwapQuote, Refuel } from '@/lib/apiClients/layerSwapApiClient';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { SwapStatus } from '@/Models/SwapStatus';
import { SwapFailReasons } from '@/Models/RangeError';
import { Gauge } from './gauge';
import { CircleCheck, Undo2 } from 'lucide-react';
import Failed from '../Failed';
import { Progress, ProgressStates, ProgressStatus, StatusStep } from './types';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import CountdownTimer from '@/components/Common/CountDownTimer';
import useSWR from 'swr';
import { ApiResponse } from '@/Models/ApiResponse';
import { useIntercom } from 'react-use-intercom';
import Steps from './StepsComponent';
import { useCallbacks } from '@/context/callbackProvider';
import { ErrorHandler } from '@/lib/ErrorHandler';
import { getExplorerUrl } from '@/lib/address/explorerUrl';

type Props = {
    swapBasicData: SwapBasicData;
    swapDetails: SwapDetails;
    quote: SwapQuote | undefined;
    refuel: Refuel | undefined;
}

const Processing: FC<Props> = ({ swapBasicData, swapDetails, quote, refuel }) => {
    const { boot, show, update } = useIntercom();
    const { setSwapTransaction, swapTransactions } = useSwapTransactionStore();
    const { onSwapStatusChange } = useCallbacks()
    const {
        source_network,
        destination_network,
        destination_token,
    } = swapBasicData
    const { fail_reason } = swapDetails

    const updateWithProps = () => update({ customAttributes: { swapId: swapDetails.id } });
    const startIntercom = useCallback(() => {
        boot();
        show();
        updateWithProps();
    }, [boot, show, updateWithProps]);

    const input_tx_explorer = source_network?.transaction_explorer_template
    const output_tx_explorer = destination_network?.transaction_explorer_template

    const swapInputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Input)
    const storedWalletTransaction = swapTransactions?.[swapDetails?.id]

    const transactionHash = swapInputTransaction?.transaction_hash || storedWalletTransaction?.hash
    const swapOutputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Refuel)
    const swapRefundTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Refund)

    const apiClient = new LayerSwapApiClient()
    const { data: inputTxStatusData } = useSWR<ApiResponse<{ status: TransactionStatus }>>((transactionHash && swapInputTransaction?.status !== BackendTransactionStatus.Completed) ? [source_network?.name, transactionHash] : null, ([network, tx_id]) => apiClient.GetTransactionStatus(network, tx_id as any), { dedupingInterval: 6000 })

    const inputTxStatus = swapInputTransaction ? swapInputTransaction.status : inputTxStatusData?.data?.status.toLowerCase() as TransactionStatus

    const loggedNotDetectedTxAt = useRef<number | null>(null);

    useEffect(() => {
        if (inputTxStatus === TransactionStatus.Completed || inputTxStatus === TransactionStatus.Pending) {
            if (swapDetails?.transactions?.find(t => t.type === TransactionType.Input) || !swapDetails) {
                return
            }
            if (Date.now() - (loggedNotDetectedTxAt.current || storedWalletTransaction.timestamp) > 60000) {
                loggedNotDetectedTxAt.current = Date.now();
                const error = new Error(`Transaction not detected in ${source_network.name}. Tx hash: \`${transactionHash}\`. Tx status: ${inputTxStatus}. Swap id: \`${swapDetails.id}\`. ${source_network.display_name} explorer: ${getExplorerUrl(source_network?.transaction_explorer_template, transactionHash)} . LS explorer: https://layerswap.io/explorer/${storedWalletTransaction?.hash} `);
                ErrorHandler({
                    type: "TransactionNotDetected",
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    cause: error.cause
                })
            }
        }
    }, [swapDetails, storedWalletTransaction, source_network]);

    useEffect(() => {
        if (storedWalletTransaction?.status !== inputTxStatus) setSwapTransaction(swapDetails?.id, inputTxStatus, storedWalletTransaction?.hash)
    }, [inputTxStatus])

    useEffect(() => {
        if (inputTxStatus === TransactionStatus.Failed) {
            const err = new Error("Transaction failed")
            const error = new Error(`Swap:${swapDetails?.id} transaction:${transactionHash} failed`);
            error.name = `TransactionFailed`;
            error.cause = err;
            ErrorHandler({
                type: "TransactionFailed",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause,
                swapId: swapDetails?.id,
                transactionHash: transactionHash,
                fromAddress: swapInputTransaction?.from,
                toAddress: swapBasicData?.destination_address
            })
        }
    }, [inputTxStatus, transactionHash, swapDetails?.id])

    useEffect(() => {
        const status = swapDetails?.status
        if (
            status === SwapStatus.Completed ||
            status === SwapStatus.Failed ||
            status === SwapStatus.Expired ||
            status === SwapStatus.LsTransferPending
        ) {
            onSwapStatusChange({
                type: status,
                swapId: swapDetails?.id!,
                path: 'Processing',
            })
        }
    }, [swapDetails?.status, swapDetails?.id])

    const truncatedRefuelAmount = refuel && truncateDecimals(refuel.amount, refuel.token?.precision)

    const progressStatuses = getProgressStatuses(swapDetails, refuel, inputTxStatusData?.data?.status.toLowerCase() as TransactionStatus)
    const stepStatuses = progressStatuses.stepStatuses;

    const countDownTimer = quote?.avg_completion_time && <div className='text-primary-text'>
        <CountdownTimer
            initialTime={String(quote?.avg_completion_time)}
            swapDetails={swapDetails}
        />
    </div>

    const progressStates: ProgressStates = {
        "input_transfer": {
            upcoming: {
                name: 'Waiting for your transfer',
                description: null
            },
            current: {
                name: 'Processing your deposit',
                description: <div className='flex space-x-1'>
                    <div className='flex items-center space-x-1'>
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
                description: <div className='flex items-center space-x-1'>
                    <span>We’ve received your deposit. </span>
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
                        {inputTxStatus === TransactionStatus.Failed ?
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
                                    <div><span className='text-secondary-text'>Something went wrong while processing the transfer.</span> <span className='underline hover:cursor-pointer text-secondary-text' onClick={() => startIntercom()}> please contact our support.</span></div>
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
                    <div className='flex items-center space-x-1'>
                        <span>Transaction: </span>
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
                                        <div><span className='text-secondary-text'>Something went wrong while processing the transfer.</span> <span className='underline hover:cursor-pointer text-secondary-text' onClick={() => startIntercom()}> please contact our support.</span></div>
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
                description: <div className='flex items-center space-x-1'>
                    <span>Transaction: </span>
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
                description: <div className='flex items-center space-x-1 text-secondary-text'>
                    <span>The full deposit amount has been sent back to your wallet.</span>
                    {
                        swapRefundTransaction && (
                            <LinkWithIcon
                                name={'View in explorer'}
                                url={getExplorerUrl(output_tx_explorer, swapRefundTransaction?.transaction_hash || '')}
                            />
                        )}
                </div>
            },
            failed: {
                name: 'Refund Failed',
                description: <div className='space-x-1 text-secondary-text'>
                    <span>Something went wrong while processing the refund.</span> <span className='underline hover:cursor-pointer text-secondary-text' onClick={() => startIntercom()}> please contact our support.</span>
                </div>
            }
        }
    }

    const allSteps: StatusStep[] = [
        {
            name: progressStates.input_transfer?.[stepStatuses?.input_transfer]?.name,
            status: stepStatuses.input_transfer,
            description: progressStates?.input_transfer?.[stepStatuses?.input_transfer]?.description,
            index: 1
        },
        {
            name: progressStates.output_transfer?.[stepStatuses?.output_transfer]?.name,
            status: stepStatuses.output_transfer,
            description: progressStates?.output_transfer?.[stepStatuses?.output_transfer]?.description,
            index: 2
        },
        {
            name: progressStates.refuel?.[stepStatuses?.refuel]?.name,
            status: stepStatuses.refuel,
            description: progressStates.refuel?.[stepStatuses?.refuel]?.description,
            index: 3
        },
        {
            name: progressStates.refund?.[stepStatuses?.refund]?.name,
            status: stepStatuses.refund,
            description: progressStates.refund?.[stepStatuses?.refund]?.description,
            index: 4
        }
    ]

    let currentSteps = allSteps.filter((s) => s.status && s.status != ProgressStatus.Removed);
    let stepsProgressPercentage = currentSteps.filter(x => x.status == ProgressStatus.Complete).length / currentSteps.length * 100;

    const swapStatus = swapDetails.status;
    return (
        <Widget.Content fitContent>
            <div className={`w-full min-h-[410px] h-full space-y-3 flex flex-col justify-between text-primary-text`}>
                <SwapSummary />
                <div className="bg-secondary-500 font-normal px-3 pt-6 pb-3 rounded-2xl space-y-4 flex flex-col w-full relative z-10 divide-y-2 divide-secondary-300 divide-dashed">
                    <div className='pb-4'>
                        <div className='flex flex-col gap-2 items-center'>
                            <div className='flex items-center'>
                                {swapStatus === SwapStatus.PendingRefund && (
                                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                                        <Undo2 className="h-7 w-7 text-primary" aria-hidden="true" />
                                    </span>
                                )}

                                {swapStatus === SwapStatus.Refunded && (
                                    <span className="relative z-10 flex h-10 w-10 items-center justify-center">
                                        <CircleCheck className="h-10 w-10 text-primary" strokeWidth={2} aria-hidden="true" />
                                    </span>
                                )}

                                {swapStatus !== SwapStatus.PendingRefund && swapStatus !== SwapStatus.Refunded && (
                                    <Gauge
                                        value={stepsProgressPercentage}
                                        size="small"
                                        showCheckmark={swapStatus === SwapStatus.Completed}
                                    />
                                )}
                            </div>
                            <div className="flex-col text-center ">
                                <span className="font-medium text-primary-text">
                                    {progressStatuses.generalStatus.title}
                                </span>
                                {
                                    progressStatuses.generalStatus.subTitle &&
                                    <span className="text-sm block text-secondary-text">
                                        {progressStatuses.generalStatus.subTitle}
                                    </span>
                                }
                                {swapOutputTransaction?.status != BackendTransactionStatus.Completed && (swapStatus !== SwapStatus.Cancelled && swapStatus !== SwapStatus.Expired && swapStatus !== SwapStatus.Failed && swapStatus !== SwapStatus.PendingRefund && swapStatus !== SwapStatus.Refunded) &&
                                    <span className='text-sm block space-x-1 text-secondary-text'>
                                        <span>{countDownTimer}</span>
                                    </span>
                                }
                            </div>
                        </div>
                    </div>
                    <div className='pt-4'>
                        {
                            swapStatus != SwapStatus.Cancelled && swapStatus != SwapStatus.Expired && currentSteps.find(x => x.status != null) &&
                            <div className='flex flex-col justify-center space-y-4'>
                                <Steps steps={currentSteps} />
                            </div>
                        }
                        {
                            ([SwapStatus.Expired, SwapStatus.Cancelled, SwapStatus.UserTransferDelayed].includes(swapStatus)) &&
                            <Failed />
                        }
                    </div>
                </div>
            </div>
        </Widget.Content>
    )
}

const resolveSwapInputTxStatus = (swapInputTransaction: Transaction | undefined, inputTxStatusFromApi: TransactionStatus) => {
    if (swapInputTransaction) {
        if (swapInputTransaction.status === BackendTransactionStatus.Completed && swapInputTransaction.confirmations < swapInputTransaction.max_confirmations)
            return TransactionStatus.Pending
        return swapInputTransaction?.status
    }
    if (inputTxStatusFromApi === TransactionStatus.Failed)
        return inputTxStatusFromApi
    else
        ///For cases when transaction is completed but not detected by bridge API
        return TransactionStatus.Pending
}

const getProgressStatuses = (swapDetails: SwapDetails, refuel: Refuel | undefined, inputTxStatusFromApi: TransactionStatus): { stepStatuses: { [key in Progress]: ProgressStatus }, generalStatus: { title: string, subTitle: string | null } } => {
    const swapStatus = swapDetails.status
    let generalTitle = "Transfer in progress";
    let subtitle: string | null = "";
    const swapInputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Input)
    const swapInputTxStatus = resolveSwapInputTxStatus(swapInputTransaction, inputTxStatusFromApi)

    const swapOutputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Output);
    const swapRefuelTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Refuel);

    let inputIsCompleted = swapInputTransaction && swapInputTransaction.confirmations >= swapInputTransaction.max_confirmations;

    if (!inputIsCompleted) {
        // Magic case, shows estimated time
        subtitle = null
    }

    let input_transfer = transactionStatusToProgressStatus(swapInputTxStatus) || ''

    let output_transfer = (swapOutputTransaction?.transaction_hash && swapOutputTransaction?.amount) ? ProgressStatus.Complete : inputIsCompleted ? ProgressStatus.Current : ProgressStatus.Upcoming;

    let refuel_transfer = (swapRefuelTransaction?.transaction_hash && swapRefuelTransaction?.amount) ? ProgressStatus.Complete : !!refuel ? ProgressStatus.Upcoming : ProgressStatus.Removed;

    let refund_status = ProgressStatus.Removed;

    if (swapStatus === SwapStatus.PendingRefund || swapStatus === SwapStatus.Refunded) {
        // For refund cases: 1) Deposit Confirmed 2) Processing Failed 3) Refund Pending/Completed
        input_transfer = ProgressStatus.Complete; // Step 1: Deposit Confirmed
        output_transfer = ProgressStatus.Failed; // Step 2: Processing Failed
        refuel_transfer = ProgressStatus.Removed; // Remove refuel step for refunds
        refund_status = swapStatus === SwapStatus.Refunded ? ProgressStatus.Complete : ProgressStatus.Current;
        generalTitle = swapStatus === SwapStatus.Refunded ? "Refund complete" : "Processing refund";
        subtitle = swapStatus === SwapStatus.Refunded ? "We couldn’t complete your transaction. The full amount has been returned to your wallet." : "Your transaction could not be processed. The full amount will be returned to your wallet.";
    } else if (swapStatus === SwapStatus.Failed) {
        output_transfer = output_transfer == ProgressStatus.Complete ? ProgressStatus.Complete : ProgressStatus.Failed;
        refuel_transfer = refuel_transfer !== ProgressStatus.Complete ? ProgressStatus.Removed : refuel_transfer;
        generalTitle = swapDetails?.fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ? "Transfer on hold" : "Transfer failed";
        subtitle = "View instructions below"
    }

    if (swapInputTxStatus == TransactionStatus.Failed) {
        input_transfer = ProgressStatus.Failed;
        generalTitle = swapDetails?.fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ? "Transfer on hold" : "Transfer failed";
        subtitle = "View instructions below"
    }

    if (swapStatus === SwapStatus.UserTransferDelayed) {
        input_transfer = ProgressStatus.Removed;
        output_transfer = ProgressStatus.Removed;
        refuel_transfer = ProgressStatus.Removed;
        generalTitle = "Transfer delayed"
        subtitle = "View instructions below"
    }

    if (swapStatus == SwapStatus.Completed) {
        generalTitle = "Transfer complete"
        subtitle = "Thanks for using Layerswap"
    }
    if (swapStatus == SwapStatus.Cancelled) {
        generalTitle = "Transfer cancelled"
        subtitle = "..."
    }
    if (swapStatus == SwapStatus.Expired) {
        generalTitle = "Transfer expired"
        subtitle = "..."
    }
    return {
        stepStatuses: {
            "input_transfer": input_transfer,
            "output_transfer": output_transfer,
            "refuel": refuel_transfer,
            "refund": refund_status,
        },
        generalStatus: {
            title: generalTitle,
            subTitle: subtitle
        }
    };

}

const transactionStatusToProgressStatus = (transactionStatus: BackendTransactionStatus | TransactionStatus | undefined): ProgressStatus => {
    switch (transactionStatus) {
        case BackendTransactionStatus.Completed:
            return ProgressStatus.Complete;
        case BackendTransactionStatus.Failed:
            return ProgressStatus.Failed;
        case BackendTransactionStatus.Initiated:
        case BackendTransactionStatus.Pending:
            return ProgressStatus.Current;
        default:
            return ProgressStatus.Upcoming;
    }
}

export default Processing;