import LinkWithIcon from '@/components/Common/LinkWithIcon';
import {
    SwapPhase,
    type ResolvedSwapStatus,
} from '@/components/utils/resolveSwapPhase';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import Content from '@/components/Widget/Content';
import { getExplorerUrl } from '@/lib/address/explorerUrl';
import {
    TransactionStatus,
    TransactionType,
    type SwapBasicData,
    type SwapDetails,
} from '@/lib/apiClients/layerSwapApiClient';
import { SwapFailReasons } from '@/Models/RangeError';
import { SwapStatus, type Refuel } from '@layerswap/widget-types';
import { CircleCheck, Undo2 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Gauge } from '../Processing/gauge';
import Steps from '../Processing/StepsComponent';
import {
    ProgressStates,
    ProgressStatus,
    StatusStep,
} from '../Processing/types';

export function ProcessingView({
    swapBasicData,
    swapDetails,
    refuel,
    resolved,
    transactionHash,
    inputConfirmations,
    inputMaxConfirmations,
    isDepositFlow = false,
    summary,
    quoteDetails,
    elapsedTime,
    failedPanel,
    onGetHelp,
    readOnly,
}: {
    swapBasicData: SwapBasicData;
    swapDetails: SwapDetails;
    refuel?: Refuel;
    resolved: ResolvedSwapStatus;
    transactionHash?: string;
    inputConfirmations?: number;
    inputMaxConfirmations?: number;
    isDepositFlow?: boolean;
    summary: ReactNode;
    quoteDetails?: ReactNode;
    elapsedTime: ReactNode;
    failedPanel: ReactNode;
    onGetHelp?: () => void;
    readOnly?: boolean;
}) {
    const { source_network, destination_network, destination_token } =
        swapBasicData;
    const { fail_reason } = swapDetails;
    const input_tx_explorer = source_network.transaction_explorer_template;
    const output_tx_explorer =
        destination_network.transaction_explorer_template;
    const swapInputTransaction = swapDetails.transactions.find(
        (t) => t.type === TransactionType.Input,
    );
    const swapOutputTransaction = swapDetails.transactions.find(
        (t) => t.type === TransactionType.Output,
    );
    const swapRefuelTransaction = swapDetails.transactions.find(
        (t) => t.type === TransactionType.Refuel,
    );
    const swapRefundTransaction = swapDetails.transactions.find(
        (t) => t.type === TransactionType.Refund,
    );
    const {
        stepStatuses,
        generalStatus,
        phase,
        swapInputTxStatus,
        isRefundFlow,
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
                    description: transactionHash ? (
                        <div className="flex space-x-1">
                            <div>
                                <LinkWithIcon
                                    disabled={readOnly}
                                    name={'View in explorer'}
                                    url={getExplorerUrl(
                                        input_tx_explorer,
                                        transactionHash,
                                    )}
                                />
                            </div>
                            <div>
                                <span>
                                    {inputConfirmations != null &&
                                        inputMaxConfirmations != null &&
                                        inputConfirmations > 0 && (
                                            <div>
                                                <span className="whitespace-nowrap">
                                                    | Confirmations{' '}
                                                </span>
                                                <span className="text-primary-text ml-1">
                                                    <span>
                                                        {Math.min(
                                                            inputConfirmations,
                                                            inputMaxConfirmations,
                                                        )}
                                                    </span>
                                                    <span>/</span>
                                                    {inputMaxConfirmations}
                                                </span>
                                            </div>
                                        )}
                                </span>
                            </div>
                        </div>
                    ) : null,
                },
                complete: {
                    name: isDepositFlow
                        ? `Transfer confirmed`
                        : `Deposit confirmed`,
                    description: (
                        <div>
                            <span>{`We've received your ${isDepositFlow ? 'transfer' : 'deposit'}.`}</span>{' '}
                            <LinkWithIcon
                                disabled={readOnly}
                                name={'View in explorer'}
                                url={getExplorerUrl(
                                    input_tx_explorer,
                                    transactionHash,
                                )}
                            />
                        </div>
                    ),
                },
                failed: {
                    name: `The transfer failed`,
                    description: (
                        <div className="flex space-x-1">
                            <div className="space-x-1 text-primary-text">
                                {swapInputTxStatus ===
                                    TransactionStatus.Failed &&
                                transactionHash ? (
                                    <div className="flex flex-col">
                                        <p>
                                            Check the transfer in the explorer
                                        </p>
                                        <LinkWithIcon
                                            disabled={readOnly}
                                            name={'View in explorer'}
                                            url={getExplorerUrl(
                                                input_tx_explorer,
                                                transactionHash,
                                            )}
                                        />
                                    </div>
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
                    name: `${swapOutputTransaction?.amount && truncateDecimals(swapOutputTransaction?.amount, destination_token.decimals)} ${destination_token.asset} ${isDepositFlow ? 'deposited' : 'was sent to your address'}`,
                    description: swapOutputTransaction?.amount ? (
                        <div className="flex flex-col">
                            <div>
                                <span>Transaction: </span>{' '}
                                <LinkWithIcon
                                    disabled={readOnly}
                                    name={'View in explorer'}
                                    url={getExplorerUrl(
                                        output_tx_explorer,
                                        swapOutputTransaction?.transaction_hash,
                                    )}
                                />
                            </div>
                        </div>
                    ) : null,
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
                    description: (
                        <div>
                            <span>Transaction: </span>{' '}
                            {swapRefuelTransaction && (
                                <LinkWithIcon
                                    disabled={readOnly}
                                    name={'View in explorer'}
                                    url={getExplorerUrl(
                                        output_tx_explorer,
                                        swapRefuelTransaction?.transaction_hash,
                                    )}
                                />
                            )}
                        </div>
                    ),
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
                    description: (
                        <div className="text-secondary-text">
                            <span>
                                The full deposit amount has been sent back to
                                your wallet.
                            </span>{' '}
                            {swapRefundTransaction && (
                                <LinkWithIcon
                                    disabled={readOnly}
                                    name={'View in explorer'}
                                    url={getExplorerUrl(
                                        input_tx_explorer,
                                        swapRefundTransaction?.transaction_hash ||
                                            '',
                                    )}
                                />
                            )}
                        </div>
                    ),
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
            input_tx_explorer,
            output_tx_explorer,
            transactionHash,
            swapInputTransaction,
            inputConfirmations,
            inputMaxConfirmations,
            swapOutputTransaction,
            swapRefuelTransaction,
            swapRefundTransaction,
            destination_token.asset,
            destination_token.decimals,
            refuel?.token?.asset,
            truncatedRefuelAmount,
            fail_reason,
            swapDetails.status,
            swapInputTxStatus,
            onGetHelp,
            isDepositFlow,
            readOnly,
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
                index: 2,
            },
            {
                name: progressStates.refuel?.[stepStatuses.refuel]?.name,
                status: stepStatuses.refuel,
                description:
                    progressStates.refuel?.[stepStatuses.refuel]?.description,
                index: 3,
            },
            {
                name: progressStates.refund?.[stepStatuses.refund]?.name,
                status: stepStatuses.refund,
                description:
                    progressStates.refund?.[stepStatuses.refund]?.description,
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
    }, [progressStates, stepStatuses]);

    return (
        <Content fitContent>
            <div
                className={`w-full min-h-102.5 h-full space-y-2 flex flex-col justify-between text-primary-text`}
            >
                {summary}
                {quoteDetails}
                <div className="bg-secondary-500 font-normal px-3 pt-6 pb-3 rounded-2xl space-y-4 flex flex-col w-full relative z-10 divide-y-2 divide-secondary-300 divide-dashed">
                    <div className="pb-4">
                        <div className="flex flex-col gap-2 items-center">
                            <div className="flex items-center">
                                {phase === SwapPhase.PendingRefund && (
                                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                                        <Undo2
                                            className="h-7 w-7 text-primary"
                                            aria-hidden="true"
                                        />
                                    </span>
                                )}

                                {phase === SwapPhase.Refunded && (
                                    <span className="relative z-10 flex h-10 w-10 items-center justify-center">
                                        <CircleCheck
                                            className="h-10 w-10 text-primary"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        />
                                    </span>
                                )}

                                {!isRefundFlow && (
                                    <Gauge
                                        value={stepsProgressPercentage}
                                        size="small"
                                        showCheckmark={
                                            stepsProgressPercentage == 100
                                        }
                                    />
                                )}
                            </div>
                            <div className="flex-col text-center">
                                <span className="font-medium text-primary-text">
                                    {generalStatus.title}
                                </span>
                                {generalStatus.subTitle && (
                                    <span className="text-sm block text-secondary-text">
                                        {generalStatus.subTitle}
                                    </span>
                                )}
                                {showsEstimatedTime && (
                                    <span className="text-sm block space-x-1 text-secondary-text">
                                        <span>
                                            {elapsedTime ? (
                                                <div className="text-primary-text">
                                                    {elapsedTime}
                                                </div>
                                            ) : null}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="pt-4">
                        {!hidesSteps && currentSteps.length > 0 && (
                            <div className="flex flex-col justify-center space-y-4">
                                <Steps steps={currentSteps} />
                            </div>
                        )}
                        {showsFailedPanel && failedPanel}
                    </div>
                </div>
            </div>
        </Content>
    );
}
