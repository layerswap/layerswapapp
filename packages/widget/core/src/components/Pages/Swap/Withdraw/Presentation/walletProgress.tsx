import type { ReactNode } from 'react';
import type {
    DepositAction,
    SwapQuote,
} from '@/lib/apiClients/layerSwapApiClient';
import type { SwapStepTransactions } from '@/stores/swapTransactionStore';
import { getCurrentDepositActionIndex } from '@/helpers/depositActions';
import { WalletMessageDetails } from '../messages/Message';
import { getDepositWorkflowProgress } from './DepositWorkflowView';

export type WalletProgressData = {
    quote?: SwapQuote;
    depositActions?: DepositAction[];
    stepTransactions?: SwapStepTransactions;
    loading?: boolean;
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
    const isMultiStepWorkflow =
        (depositActions?.filter((action) => !!action.step).length ?? 0) > 1 ||
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

    return getDepositWorkflowProgress({
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
}
