import {
    SwapPhase,
    type ResolvedSwapStatus,
} from '@/components/utils/resolveSwapPhase';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { getExplorerUrl } from '@/lib/address/explorerUrl';
import {
    TransactionType,
    type SwapBasicData,
    type SwapDetails,
    type DepositAction,
    type SwapQuote,
} from '@/lib/apiClients/layerSwapApiClient';
import { SwapFailReasons } from '@/Models/RangeError';
import { SwapStatus, type Refuel } from '@layerswap/widget-types';
import { CircleCheck, Undo2 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { TransferStatusHeader } from './TransferStatusHeader';
import Steps, { StepsPanel } from '../Processing/StepsComponent';
import {
    ProgressStates,
    ProgressStatus,
    StatusStep,
} from '../Processing/types';
import { DepositWorkflowView } from './DepositWorkflowView';
import shortenString from '@/components/utils/ShortenString';

export function ProcessingView({
    swapBasicData,
    swapDetails,
    refuel,
    resolved,
    transactionHash,
    inputConfirmations,
    inputMaxConfirmations,
    inputFailureMessage,
    isDepositFlow = false,
    elapsedTime,
    failedPanel,
    onGetHelp,
    readOnly,
    depositActions,
    quote,
}: {
    swapBasicData: SwapBasicData;
    swapDetails: SwapDetails;
    refuel?: Refuel;
    resolved: ResolvedSwapStatus;
    transactionHash?: string;
    inputConfirmations?: number;
    inputMaxConfirmations?: number;
    inputFailureMessage?: string;
    isDepositFlow?: boolean;
    elapsedTime: ReactNode;
    failedPanel: ReactNode;
    onGetHelp?: () => void;
    readOnly?: boolean;
    depositActions?: DepositAction[];
    quote?: SwapQuote;
}) {
    const { source_network, destination_network, destination_token } =
        swapBasicData;
    const { fail_reason } = swapDetails;
    const input_tx_explorer = source_network.transaction_explorer_template;
    const output_tx_explorer =
        destination_network.transaction_explorer_template;
    const swapOutputTransaction = swapDetails.transactions.find(
        (t) => t.type === TransactionType.Output,
    );
    const swapRefuelTransaction = swapDetails.transactions.find(
        (t) => t.type === TransactionType.Refuel,
    );
    const swapRefundTransaction = swapDetails.transactions.find(
        (t) => t.type === TransactionType.Refund,
    );
    const inputExplorerUrl = getExplorerUrl(input_tx_explorer, transactionHash);
    const outputExplorerUrl = getExplorerUrl(
        output_tx_explorer,
        swapOutputTransaction?.transaction_hash,
    );
    const refuelExplorerUrl = getExplorerUrl(
        output_tx_explorer,
        swapRefuelTransaction?.transaction_hash,
    );
    const refundExplorerUrl = getExplorerUrl(
        input_tx_explorer,
        swapRefundTransaction?.transaction_hash,
    );
    const {
        stepStatuses,
        generalStatus,
        phase,
        hidesSteps,
        showsFailedPanel,
        showsEstimatedTime,
    } = resolved;
    const truncatedRefuelAmount =
        refuel && truncateDecimals(refuel.amount, refuel.token?.precision);

    const progressStates = useMemo<ProgressStates>(
        () => ({
            input_transfer: {
                upcoming: {
                    name: 'Waiting for your transfer',
                    description: null,
                },
                current: {
                    name: isDepositFlow
                        ? 'Processing your transfer'
                        : 'Processing your deposit',
                    description:
                        inputConfirmations != null &&
                            inputMaxConfirmations != null &&
                            inputConfirmations > 0 ? (
                            <span>
                                Confirmations{' '}
                                <span className="text-primary-text">
                                    {Math.min(
                                        inputConfirmations,
                                        inputMaxConfirmations,
                                    )}
                                    /{inputMaxConfirmations}
                                </span>
                            </span>
                        ) : null,
                },
                complete: {
                    name: isDepositFlow
                        ? `Transfer confirmed`
                        : `Deposit confirmed`,
                    description: `We've received your ${isDepositFlow ? 'transfer' : 'deposit'}.`,
                },
                failed: {
                    name: `The transfer failed`,
                    description: inputFailureMessage || (
                        <div className="flex space-x-1">
                            <div className="space-x-1 text-primary-text">
                                {fail_reason ==
                                    SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ? (
                                    "Your deposit is higher than the max limit. We'll review and approve your transaction in up to 2 hours."
                                ) : fail_reason ==
                                    SwapFailReasons.RECEIVED_LESS_THAN_VALID_RANGE ? (
                                    "Your deposit is lower than the minimum required amount. Unfortunately, we can't process the transaction. Please contact support to check if you're eligible for a refund."
                                ) : (
                                    <div>
                                        <span className="text-secondary-text">
                                            Something went wrong while
                                            processing the transfer.
                                        </span>{' '}
                                        <span
                                            className="underline hover:cursor-pointer text-secondary-text"
                                            onClick={() => onGetHelp?.()}
                                        >
                                            {' '}
                                            please contact our support.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ),
                },
                delayed: {
                    name: `This transfer is being delayed by Coinbase`,
                    description: null,
                },
            },
            output_transfer: {
                upcoming: {
                    name: isDepositFlow
                        ? 'Completing your deposit'
                        : `Sending ${destination_token.asset} to your address`,
                    description: null,
                },
                current: {
                    name: isDepositFlow
                        ? 'Completing your deposit'
                        : `Sending ${destination_token.asset} to your address`,
                    description: null,
                },
                complete: {
                    name: `${swapOutputTransaction?.amount && truncateDecimals(swapOutputTransaction?.amount, destination_token.precision ?? destination_token.decimals)} ${destination_token.asset} ${isDepositFlow ? 'deposited' : 'was sent to your address'}`,
                    description: null,
                },
                failed: {
                    name:
                        swapDetails.status === SwapStatus.PendingRefund ||
                            swapDetails.status === SwapStatus.Refunded
                            ? 'Processing Failed'
                            : fail_reason ==
                                SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE
                                ? `The transfer is on hold`
                                : 'The transfer has failed',
                    description: (
                        <div className="flex space-x-1">
                            <div className="space-x-1 text-secondary-text">
                                {swapDetails.status ===
                                    SwapStatus.PendingRefund ||
                                    swapDetails.status === SwapStatus.Refunded ? (
                                    "There was an issue completing the transfer. We're refunding your deposit."
                                ) : fail_reason ==
                                    SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ? (
                                    "Your deposit is higher than the max limit. We'll review and approve your transaction in up to 2 hours."
                                ) : fail_reason ==
                                    SwapFailReasons.RECEIVED_LESS_THAN_VALID_RANGE ? (
                                    "Your deposit is lower than the minimum required amount. Unfortunately, we can't process the transaction. Please contact support to check if you're eligible for a refund."
                                ) : (
                                    <div>
                                        <span className="text-secondary-text">
                                            Something went wrong while
                                            processing the transfer.
                                        </span>{' '}
                                        <span
                                            className="underline hover:cursor-pointer text-secondary-text"
                                            onClick={() => onGetHelp?.()}
                                        >
                                            {' '}
                                            please contact our support.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ),
                },
                delayed: {
                    name: `This swap is being delayed by Coinbase`,
                    description: null,
                },
            },
            refuel: {
                upcoming: {
                    name: `Sending ${refuel?.token?.asset} to your address`,
                    description: null,
                },
                current: {
                    name: `Sending ${refuel?.token?.asset} to your address`,
                    description: null,
                },
                complete: {
                    name: `${truncatedRefuelAmount} ${refuel?.token?.asset} was sent to your address`,
                    description: null,
                },
                delayed: {
                    name: `This transfers is being delayed`,
                    description: null,
                },
            },
            refund: {
                upcoming: {
                    name: 'Refund Pending',
                    description: null,
                },
                current: {
                    name: 'Refund Pending',
                    description: (
                        <div className="text-secondary-text">
                            Your refund is being processed.
                        </div>
                    ),
                },
                complete: {
                    name: 'Refund sent',
                    description:
                        'The full deposit amount has been sent back to your wallet.',
                },
                failed: {
                    name: 'Refund Failed',
                    description: (
                        <div className="space-x-1 text-secondary-text">
                            <span>
                                Something went wrong while processing the
                                refund.
                            </span>{' '}
                            <span
                                className="underline hover:cursor-pointer text-secondary-text"
                                onClick={() => onGetHelp?.()}
                            >
                                {' '}
                                please contact our support.
                            </span>
                        </div>
                    ),
                },
            },
        }),
        [
            inputConfirmations,
            inputMaxConfirmations,
            inputFailureMessage,
            swapOutputTransaction,
            destination_token.asset,
            destination_token.decimals,
            destination_token.precision,
            refuel?.token?.asset,
            truncatedRefuelAmount,
            fail_reason,
            swapDetails.status,
            onGetHelp,
            isDepositFlow,
        ],
    );

    const { currentSteps, stepsProgressPercentage } = useMemo(() => {
        const allSteps: StatusStep[] = [
            {
                name: progressStates.input_transfer?.[
                    stepStatuses.input_transfer
                ]?.name,
                status: stepStatuses.input_transfer,
                description:
                    progressStates.input_transfer?.[stepStatuses.input_transfer]
                        ?.description,
                explorerUrl: inputExplorerUrl,
                readOnly,
                index: 1,
            },
            {
                name: progressStates.output_transfer?.[
                    stepStatuses.output_transfer
                ]?.name,
                status: stepStatuses.output_transfer,
                description:
                    progressStates.output_transfer?.[
                        stepStatuses.output_transfer
                    ]?.description,
                explorerUrl: outputExplorerUrl,
                readOnly,
                index: 2,
            },
            {
                name: progressStates.refuel?.[stepStatuses.refuel]?.name,
                status: stepStatuses.refuel,
                description:
                    progressStates.refuel?.[stepStatuses.refuel]?.description,
                explorerUrl: refuelExplorerUrl,
                readOnly,
                index: 3,
            },
            {
                name: progressStates.refund?.[stepStatuses.refund]?.name,
                status: stepStatuses.refund,
                description:
                    progressStates.refund?.[stepStatuses.refund]?.description,
                explorerUrl: refundExplorerUrl,
                readOnly,
                index: 4,
            },
        ];
        const current = allSteps.filter(
            (s) => s.status && s.status !== ProgressStatus.Removed,
        );
        let completed = 0;
        for (const s of current)
            if (s.status === ProgressStatus.Complete) completed++;
        const percentage = current.length
            ? (completed / current.length) * 100
            : 0;
        return { currentSteps: current, stepsProgressPercentage: percentage };
    }, [
        progressStates,
        stepStatuses,
        inputExplorerUrl,
        outputExplorerUrl,
        refuelExplorerUrl,
        refundExplorerUrl,
        readOnly,
    ]);

    const hasSwapWorkflow = !!depositActions?.some(
        (action) => action.step === 'publish',
    );
    const isTokenSwap =
        !isDepositFlow &&
        !swapBasicData.use_deposit_address &&
        (hasSwapWorkflow || source_network.name === destination_network.name);
    const displayedElapsedTime = isTokenSwap ? null : elapsedTime;
    const statusTitle =
        isTokenSwap && showsEstimatedTime
            ? 'Swap in progress'
            : generalStatus.title;
    const statusDescription =
        phase === SwapPhase.Completed && isTokenSwap
            ? null
            : generalStatus.subTitle;
    // Only a wallet-published swap has a publish step to carry into processing.
    // Sign-only gasless swaps and receipts without action history keep the
    // transaction timeline for the whole processing/completion lifecycle.
    const showUnifiedProgress =
        !isDepositFlow &&
        !swapBasicData.use_deposit_address &&
        hasSwapWorkflow &&
        !refuel &&
        (phase === SwapPhase.InputPending ||
            phase === SwapPhase.OutputPending ||
            phase === SwapPhase.SettlingOutput ||
            phase === SwapPhase.Completed);

    if (showUnifiedProgress) {
        return (
            <DepositWorkflowView
                actions={depositActions}
                readOnly={readOnly}
                destinationToken={destination_token}
                receiveAmount={
                    phase === SwapPhase.Completed
                        ? swapOutputTransaction?.amount
                        : quote?.receive_amount
                }
                completed={
                    phase === SwapPhase.Completed
                        ? {
                            completionTime: statusDescription,
                            explorerUrl: outputExplorerUrl,
                        }
                        : undefined
                }
                processing={{
                    title: statusTitle,
                    inputExplorerUrl,
                    outputExplorerUrl,
                    inputStatus: stepStatuses.input_transfer,
                    outputStatus: stepStatuses.output_transfer,
                    elapsedTime: displayedElapsedTime,
                    inputDescription:
                        stepStatuses.input_transfer ===
                            ProgressStatus.Current ? (
                            <div className="space-y-1">
                                <p>Confirming transaction · no action needed</p>
                                <div>
                                    {inputConfirmations != null &&
                                        !!inputMaxConfirmations && (
                                            <span>
                                                Confirmations{' '}
                                                {Math.min(
                                                    inputConfirmations,
                                                    inputMaxConfirmations,
                                                )}
                                                /{inputMaxConfirmations}
                                            </span>
                                        )}
                                </div>
                            </div>
                        ) : undefined,
                    outputDescription:
                        stepStatuses.output_transfer === ProgressStatus.Current
                            ? `Sending to ${shortenString(swapBasicData.destination_address)}`
                            : undefined,
                }}
            />
        );
    }

    return (
        <StepsPanel>
            <TransferStatusHeader
                title={statusTitle}
                description={
                    showsEstimatedTime
                        ? displayedElapsedTime
                        : statusDescription
                }
                progress={stepsProgressPercentage}
                completed={phase === SwapPhase.Completed}
                icon={
                    phase === SwapPhase.PendingRefund ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                            <Undo2
                                className="h-5 w-5 text-primary"
                                aria-hidden="true"
                            />
                        </span>
                    ) : phase === SwapPhase.Refunded ? (
                        <CircleCheck
                            className="h-8 w-8 text-primary"
                            strokeWidth={2}
                            aria-hidden="true"
                        />
                    ) : undefined
                }
            />
            <div className="pt-4">
                {!hidesSteps && currentSteps.length > 0 && (
                    <div className="flex flex-col justify-center space-y-4">
                        <Steps steps={currentSteps} />
                    </div>
                )}
                {showsFailedPanel && failedPanel}
            </div>
        </StepsPanel>
    );
}
