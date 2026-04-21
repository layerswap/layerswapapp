import {
    BackendTransactionStatus,
    Refuel,
    SwapDetails,
    Transaction,
    TransactionStatus,
    TransactionType,
} from '../../lib/apiClients/layerSwapApiClient';
import { SwapStatus } from '../../Models/SwapStatus';
import { SwapFailReasons } from '../../Models/RangeError';
import { Progress, ProgressStatus } from '../Swap/Withdraw/Processing/types';
import type { SwapTransaction as StoredWalletTransaction } from '../../stores/swapTransactionStore';

export enum SwapPhase {
    AwaitingUserDeposit = 'awaiting_user_deposit',
    InputPending = 'input_pending',
    OutputPending = 'output_pending',
    SettlingOutput = 'settling_output',
    Completed = 'completed',
    Failed = 'failed',
    Delayed = 'delayed',
    Expired = 'expired',
    Cancelled = 'cancelled',
    PendingRefund = 'pending_refund',
    Refunded = 'refunded',
}

export type ResolveSwapPhaseInput = {
    swapDetails: SwapDetails | undefined;
    refuel: Refuel | undefined;
    inputTxStatusFromApi?: TransactionStatus;
    storedWalletTransaction?: StoredWalletTransaction;
};

export type StepStatuses = {
    [Progress.InputTransfer]: ProgressStatus;
    [Progress.OutputTransfer]: ProgressStatus;
    [Progress.Refuel]: ProgressStatus;
    [Progress.Refund]: ProgressStatus;
};

export type ResolvedSwapStatus = {
    phase: SwapPhase;
    stepStatuses: StepStatuses;
    generalStatus: { title: string; subTitle: string | null };
    isTerminal: boolean;
    inputReady: boolean;
    outputReady: boolean;
    showWithdrawScreen: boolean;
    pollingIntervalMs: number;
    swapInputTxStatus: TransactionStatus;
    isRefundFlow: boolean;
    hidesSteps: boolean;
    showsFailedPanel: boolean;
    showsEstimatedTime: boolean;
};

const TERMINAL_PHASES: ReadonlySet<SwapPhase> = new Set([
    SwapPhase.Completed,
    SwapPhase.Failed,
    SwapPhase.Expired,
    SwapPhase.Cancelled,
    SwapPhase.Refunded,
]);

const NO_POLL_PHASES: ReadonlySet<SwapPhase> = new Set([
    SwapPhase.Completed,
    SwapPhase.Failed,
    SwapPhase.Expired,
    SwapPhase.Cancelled,
    SwapPhase.Refunded,
    SwapPhase.Delayed,
]);

export function resolveSwapPhase(input: ResolveSwapPhaseInput): ResolvedSwapStatus {
    const { swapDetails, refuel, inputTxStatusFromApi, storedWalletTransaction } = input;

    const inputTx = swapDetails?.transactions?.find(t => t.type === TransactionType.Input);
    const outputTx = swapDetails?.transactions?.find(t => t.type === TransactionType.Output);
    const refuelTx = swapDetails?.transactions?.find(t => t.type === TransactionType.Refuel);

    const swapStatus = swapDetails?.status;
    const inputReady = !!(inputTx && inputTx.confirmations >= inputTx.max_confirmations);
    const outputReady = !!(outputTx?.transaction_hash && outputTx?.amount);
    const swapInputTxStatus = resolveSwapInputTxStatus(inputTx, inputTxStatusFromApi);

    const showWithdrawScreen =
        (!swapStatus || swapStatus === SwapStatus.UserTransferPending || swapStatus === SwapStatus.Created)
        && !(inputTx || storedWalletTransaction);

    const phase = resolvePhase({
        swapStatus,
        swapInputTxStatus,
        inputReady,
        outputReady,
        hasInputTx: !!inputTx,
        hasStoredWalletTx: !!storedWalletTransaction,
        showWithdrawScreen,
    });

    const stepStatuses = resolveStepStatuses({
        phase,
        swapStatus,
        swapInputTxStatus,
        inputTx,
        outputTx,
        refuelTx,
        inputReady,
        outputReady,
        refuel,
    });

    const generalStatus = resolveGeneralStatus({
        phase,
        inputTx,
        outputTx,
        inputReady,
        failReason: swapDetails?.fail_reason,
    });

    const isTerminal = TERMINAL_PHASES.has(phase);
    const pollingIntervalMs = NO_POLL_PHASES.has(phase) ? 0 : 1000;

    const isRefundFlow = phase === SwapPhase.PendingRefund || phase === SwapPhase.Refunded;
    const hidesSteps = phase === SwapPhase.Cancelled || phase === SwapPhase.Expired;
    const showsFailedPanel = phase === SwapPhase.Expired || phase === SwapPhase.Cancelled || phase === SwapPhase.Delayed;
    const showsEstimatedTime = !outputReady && !isTerminal && phase !== SwapPhase.PendingRefund;

    return {
        phase,
        stepStatuses,
        generalStatus,
        isTerminal,
        inputReady,
        outputReady,
        showWithdrawScreen,
        pollingIntervalMs,
        swapInputTxStatus,
        isRefundFlow,
        hidesSteps,
        showsFailedPanel,
        showsEstimatedTime,
    };
}

function resolvePhase(args: {
    swapStatus: SwapStatus | undefined;
    swapInputTxStatus: TransactionStatus;
    inputReady: boolean;
    outputReady: boolean;
    hasInputTx: boolean;
    hasStoredWalletTx: boolean;
    showWithdrawScreen: boolean;
}): SwapPhase {
    const {
        swapStatus, swapInputTxStatus, inputReady, outputReady,
        hasInputTx, hasStoredWalletTx, showWithdrawScreen,
    } = args;

    if (swapStatus === SwapStatus.Cancelled) return SwapPhase.Cancelled;
    if (swapStatus === SwapStatus.Expired) return SwapPhase.Expired;
    if (swapStatus === SwapStatus.UserTransferDelayed) return SwapPhase.Delayed;
    if (swapStatus === SwapStatus.Refunded) return SwapPhase.Refunded;
    if (swapStatus === SwapStatus.PendingRefund) return SwapPhase.PendingRefund;
    if (swapStatus === SwapStatus.Failed) return SwapPhase.Failed;
    if (swapInputTxStatus === TransactionStatus.Failed) return SwapPhase.Failed;

    if (swapStatus === SwapStatus.Completed) {
        return outputReady ? SwapPhase.Completed : SwapPhase.SettlingOutput;
    }

    if (outputReady) return SwapPhase.Completed;

    if (showWithdrawScreen) return SwapPhase.AwaitingUserDeposit;

    if (swapStatus === SwapStatus.LsTransferPending) return SwapPhase.OutputPending;
    if (inputReady) return SwapPhase.OutputPending;
    if (hasInputTx || hasStoredWalletTx) return SwapPhase.InputPending;

    return SwapPhase.AwaitingUserDeposit;
}

function resolveStepStatuses(args: {
    phase: SwapPhase;
    swapStatus: SwapStatus | undefined;
    swapInputTxStatus: TransactionStatus;
    inputTx: Transaction | undefined;
    outputTx: Transaction | undefined;
    refuelTx: Transaction | undefined;
    inputReady: boolean;
    outputReady: boolean;
    refuel: Refuel | undefined;
}): StepStatuses {
    const { phase, swapStatus, swapInputTxStatus, refuelTx, inputReady, outputReady, refuel } = args;

    let input_transfer = transactionStatusToProgressStatus(swapInputTxStatus);
    let output_transfer: ProgressStatus = outputReady
        ? ProgressStatus.Complete
        : inputReady ? ProgressStatus.Current : ProgressStatus.Upcoming;
    const refuelReady = !!(refuelTx?.transaction_hash && refuelTx?.amount);
    let refuel_transfer: ProgressStatus = refuelReady
        ? ProgressStatus.Complete
        : refuel ? ProgressStatus.Upcoming : ProgressStatus.Removed;
    let refund: ProgressStatus = ProgressStatus.Removed;

    switch (phase) {
        case SwapPhase.PendingRefund:
        case SwapPhase.Refunded:
            input_transfer = ProgressStatus.Complete;
            output_transfer = ProgressStatus.Failed;
            refuel_transfer = ProgressStatus.Removed;
            refund = phase === SwapPhase.Refunded ? ProgressStatus.Complete : ProgressStatus.Current;
            break;
        case SwapPhase.Failed:
            if (swapInputTxStatus === TransactionStatus.Failed) {
                input_transfer = ProgressStatus.Failed;
                if (swapStatus === SwapStatus.Failed && output_transfer !== ProgressStatus.Complete) {
                    output_transfer = ProgressStatus.Failed;
                }
            } else if (output_transfer !== ProgressStatus.Complete) {
                output_transfer = ProgressStatus.Failed;
            }
            if (refuel_transfer !== ProgressStatus.Complete) {
                refuel_transfer = ProgressStatus.Removed;
            }
            break;
        case SwapPhase.Delayed:
            input_transfer = ProgressStatus.Removed;
            output_transfer = ProgressStatus.Removed;
            refuel_transfer = ProgressStatus.Removed;
            break;
        case SwapPhase.SettlingOutput:
            input_transfer = ProgressStatus.Complete;
            output_transfer = ProgressStatus.Current;
            break;
        case SwapPhase.Completed:
            input_transfer = ProgressStatus.Complete;
            output_transfer = ProgressStatus.Complete;
            break;
        default:
            break;
    }

    return {
        [Progress.InputTransfer]: input_transfer,
        [Progress.OutputTransfer]: output_transfer,
        [Progress.Refuel]: refuel_transfer,
        [Progress.Refund]: refund,
    };
}

function resolveGeneralStatus(args: {
    phase: SwapPhase;
    inputTx: Transaction | undefined;
    outputTx: Transaction | undefined;
    inputReady: boolean;
    failReason: string | undefined;
}): { title: string; subTitle: string | null } {
    const { phase, inputTx, outputTx, inputReady, failReason } = args;

    switch (phase) {
        case SwapPhase.Completed:
            return { title: 'Transfer complete', subTitle: formatElapsedTime(inputTx, outputTx) };
        case SwapPhase.SettlingOutput:
            return { title: 'Finalizing transfer', subTitle: null };
        case SwapPhase.Refunded:
            return {
                title: 'Refund complete',
                subTitle: 'We couldn’t complete your transaction. The full amount has been returned to your wallet.',
            };
        case SwapPhase.PendingRefund:
            return {
                title: 'Processing refund',
                subTitle: 'Your transaction could not be processed. The full amount will be returned to your wallet.',
            };
        case SwapPhase.Failed:
            return {
                title: failReason === SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ? 'Transfer on hold' : 'Transfer failed',
                subTitle: 'View instructions below',
            };
        case SwapPhase.Delayed:
            return { title: 'Transfer delayed', subTitle: 'View instructions below' };
        case SwapPhase.Cancelled:
            return { title: 'Transfer cancelled', subTitle: '...' };
        case SwapPhase.Expired:
            return { title: 'Transfer expired', subTitle: '...' };
        default:
            return { title: 'Transfer in progress', subTitle: inputReady ? '' : null };
    }
}

const BACKEND_TO_TX_STATUS: Record<BackendTransactionStatus, TransactionStatus> = {
    [BackendTransactionStatus.Completed]: TransactionStatus.Completed,
    [BackendTransactionStatus.Failed]: TransactionStatus.Failed,
    [BackendTransactionStatus.Pending]: TransactionStatus.Pending,
    [BackendTransactionStatus.Initiated]: TransactionStatus.Pending,
};

function resolveSwapInputTxStatus(
    swapInputTransaction: Transaction | undefined,
    inputTxStatusFromApi: TransactionStatus | undefined,
): TransactionStatus {
    if (swapInputTransaction) {
        if (
            swapInputTransaction.status === BackendTransactionStatus.Completed
            && swapInputTransaction.confirmations < swapInputTransaction.max_confirmations
        ) {
            return TransactionStatus.Pending;
        }
        return BACKEND_TO_TX_STATUS[swapInputTransaction.status];
    }
    if (inputTxStatusFromApi === TransactionStatus.Failed) return inputTxStatusFromApi;
    return TransactionStatus.Pending;
}

function transactionStatusToProgressStatus(
    transactionStatus: TransactionStatus | undefined,
): ProgressStatus {
    switch (transactionStatus) {
        case TransactionStatus.Completed:
            return ProgressStatus.Complete;
        case TransactionStatus.Failed:
            return ProgressStatus.Failed;
        case TransactionStatus.Pending:
            return ProgressStatus.Current;
        default:
            return ProgressStatus.Upcoming;
    }
}

function formatElapsedTime(inputTx: Transaction | undefined, outputTx: Transaction | undefined): string | null {
    const start = inputTx?.timestamp || inputTx?.created_date;
    const end = outputTx?.timestamp || outputTx?.created_date;
    if (!start || !end) return null;

    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return null;

    const totalSeconds = Math.round(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (!hours && (seconds || !minutes)) parts.push(`${seconds}s`);

    return `Completed in ${parts.join(' ')}`;
}
