import type { ReactNode } from 'react';
import type {
    DepositAction,
    SwapQuote,
} from '@/lib/apiClients/layerSwapApiClient';
import type { SwapStepTransactions } from '@/stores/swapTransactionStore';
import { getCurrentDepositActionIndex } from '@/helpers/depositActions';
import { WalletMessageDetails } from '../messages/Message';
import { getDepositWorkflowProgress } from './DepositWorkflowView';
import type { ResolvedSwapFlow } from '@/components/utils/resolveSwapFlow';
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
        showSwapProgress,
        loading,
    } = data;
    const isMultiStepWorkflow = data.flow
        ? data.flow.walletProgress === 'workflow'
        : (depositActions?.filter((action) => !!action.step).length ?? 0) > 1 ||
          (!!stepTransactions?.approve_permit2?.explorerUrl &&
              !!depositActions?.some(
                  (action) => action.step === 'approve_permit2',
              )) ||
          (!!quote?.destination_token &&
              !!depositActions?.some(
                  (action) =>
                      action.step === 'publish' ||
                      (showSwapProgress && action.step === 'deposit'),
              ));
    const hasError = data.error || data.swapError || data.gaslessUnavailable;
    const workflowFailed = depositActions?.some(
        (action) => action.status === 'failed',
    );
    const confirmingSubmission =
        isMultiStepWorkflow &&
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
    if (!isMultiStepWorkflow) return null;
    // Prepared actions describe what can run; they do not mean execution has started.
    if (data.walletExecutionStarted === false && !confirmingSubmission && !hasError) {
        return null;
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
    return getSubmittedSwapProgress(data);
}

function getSubmittedSwapProgress(data: WalletProgressData): ProgressPanelData {
    const token = data.quote?.destination_token;
    const amount = data.quote?.receive_amount;
    const steps: StatusStep[] = [{
        id: 'input_transfer',
        name: 'Confirming transaction',
        status: ProgressStatus.Current,
        isLoading: true,
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
        title: 'Swap in progress',
        label: 'Swap progress',
        progress: 0,
        announcement: 'Confirming transaction.',
        steps,
    };
}
