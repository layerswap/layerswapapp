import type { ReactNode } from 'react';
import type {
    DepositAction,
    SwapQuote,
} from '@/lib/apiClients/layerSwapApiClient';
import type { SwapStepTransactions } from '@/stores/swapTransactionStore';
import { getCurrentDepositActionIndex } from '@/helpers/depositActions';
import { WalletMessageDetails } from '../messages/Message';
import { getDepositWorkflowProgress } from './DepositWorkflowView';
import { resolveSwapFlow, type ResolvedSwapFlow } from '@/components/utils/resolveSwapFlow';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { ProgressStatus, type StatusStep } from '../Processing/types';
import type { ProgressPanelData } from './ProgressPanelView';

export type WalletProgressData = {
    flow?: ResolvedSwapFlow;
    quote?: SwapQuote;
    depositActions?: DepositAction[];
    stepTransactions?: SwapStepTransactions;
    loading?: boolean;
    walletExecutionStarted?: boolean;
    submissionAccepted?: boolean;
    submissionTimedOut?: boolean;
    error?: boolean;
    swapError?: boolean;
    gaslessUnavailable?: boolean;
    errorMessage?: ReactNode;
    actionStateText?: string;
    showSwapProgress?: boolean;
    readOnly?: boolean;
};

export function getWalletWorkflowState(data: WalletProgressData) {
    const {
        depositActions,
        stepTransactions,
        quote,
        loading,
    } = data;
    const flow = data.flow ?? resolveSwapFlow({ depositActions, stepTransactions, quote });
    const isMultiStepWorkflow = flow.walletProgress === 'workflow';
    const hasError = data.error || data.swapError || data.gaslessUnavailable;
    const workflowFailed = !data.submissionAccepted && depositActions?.some(
        (action) => action.status === 'failed',
    );
    const confirmingSubmission =
        data.submissionAccepted &&
        !hasError &&
        !workflowFailed;
    const showStepError =
        isMultiStepWorkflow &&
        !loading &&
        getCurrentDepositActionIndex(
            depositActions?.filter((action) => !!action.step) ?? [],
            true,
        ) !== -1;
    return {
        isMultiStepWorkflow,
        hasError,
        workflowFailed,
        confirmingSubmission,
        showStepError,
    };
}

export function getWalletProgress(data: WalletProgressData) {
    const {
        isMultiStepWorkflow,
        hasError,
        confirmingSubmission,
        showStepError,
    } = getWalletWorkflowState(data);
    if (data.submissionTimedOut && confirmingSubmission) {
        return getSubmittedTransactionProgress(data);
    }
    if (!isMultiStepWorkflow) {
        return confirmingSubmission ? getSubmittedTransactionProgress(data) : null;
    }
    // Prepared actions describe what can run; they do not mean execution has started.
    if (data.walletExecutionStarted === false && !confirmingSubmission && !hasError) {
        return null;
    }

    // Transfer receipts need a confirmation panel even when their single deposit
    // action has not caught up. Do not turn that action into an approval workflow.
    if (confirmingSubmission && data.flow?.kind === 'wallet-transfer') {
        return getSubmittedTransactionProgress(data);
    }

    const progress = getDepositWorkflowProgress({
        actions: data.depositActions,
        stepTransactions: data.stepTransactions,
        readOnly: data.readOnly,
        loading: data.loading || confirmingSubmission,
        error: hasError,
        errorDescription:
            showStepError && hasError && data.errorMessage ? (
                <WalletMessageDetails>{data.errorMessage}</WalletMessageDetails>
            ) : undefined,
        actionStateText: confirmingSubmission
            ? 'Confirming transaction'
            : data.actionStateText,
        destinationToken: data.quote?.destination_token,
        receiveAmount: data.quote?.receive_amount,
        showDeliveryStep: data.showSwapProgress,
    });

    if (progress || !confirmingSubmission) {
        return progress;
    }

    // A receipt can restore before action history. Keep confirmation visible
    // without inventing approval/signature steps or advancing the API phase.
    return getSubmittedTransactionProgress(data);
}

function getSubmittedTransactionProgress(data: WalletProgressData): ProgressPanelData {
    const progressSubject = {
        deposit: 'Deposit',
        transfer: 'Transfer',
        swap: 'Swap',
    }[data.flow?.processingTitle ?? 'swap'];
    const token = data.quote?.destination_token;
    const amount = data.quote?.receive_amount;
    const steps: StatusStep[] = [{
        id: 'input_transfer',
        name: data.submissionTimedOut ? 'Transaction not detected yet' : 'Confirming transaction',
        status: ProgressStatus.Current,
        isLoading: !data.submissionTimedOut,
        readOnly: data.readOnly,
        index: 1,
    }];

    if (token) {
        const receiveAmount = amount == null
            ? ''
            : `${truncateDecimals(amount, token.precision ?? token.decimals)} `;
        steps.push({
            id: 'output_transfer',
            name: `Receive ${receiveAmount}${token.asset}`,
            status: ProgressStatus.Upcoming,
            readOnly: data.readOnly,
            index: 2,
        });
    }

    return {
        title: `${progressSubject} in progress`,
        label: `${progressSubject} progress`,
        progress: 0,
        announcement: data.submissionTimedOut ? 'Transaction not detected yet. Tracking continues automatically.' : 'Confirming transaction.',
        steps,
    };
}
