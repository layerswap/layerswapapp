import { useSwapDataState } from '@/context/swap';
import { hasSwapExecutionProgress, hasUnacknowledgedWalletAction } from '@/helpers/swapProgress';
import { useDepositSignatureStore, useGaslessAuthorizationStore, useSwapTransactionStore } from '@/stores/swapTransactionStore';

/** Funding warnings must respect authorizations that can still move funds,
 * including accepted signatures whose publication has not been observed yet. */
export function useHasSubmittedTransfer(): boolean {
    const { swapId, swapDetails, depositActionsResponse, gaslessAuthorization, inputTransactionStatus } = useSwapDataState();
    const id = swapId ?? swapDetails?.id;
    const transaction = useSwapTransactionStore(state => id ? state.swapTransactions[id] : undefined);
    const pendingSubmission = useSwapTransactionStore(state => id ? state.pendingSubmissions[id] : undefined);
    const authorizationReceipt = useGaslessAuthorizationStore(state => id ? state.authorizations[id] : undefined);
    const signatureReceipt = useDepositSignatureStore(state => id ? state.signatures[id] : undefined);
    return hasSwapExecutionProgress({ swapDetails, depositActions: depositActionsResponse, gaslessAuthorization })
        || hasUnacknowledgedWalletAction({
            transaction,
            pendingSubmission,
            authorizationReceipt,
            signatureReceipt,
            transactionStatus: inputTransactionStatus,
            gaslessAuthorization,
            depositActions: depositActionsResponse,
        });
}

/** Hide wallet-readiness controls only for a submitted funding transaction.
 * A signature alone may still need a connected wallet for a later publish step. */
export function useHasSubmittedWalletTransaction(): boolean {
    const { swapId, swapDetails, gaslessAuthorization, inputTransactionStatus } = useSwapDataState();
    const id = swapId ?? swapDetails?.id;
    const transaction = useSwapTransactionStore(state => id ? state.swapTransactions[id] : undefined);
    const pendingSubmission = useSwapTransactionStore(state => id ? state.pendingSubmissions[id] : undefined);

    return hasSwapExecutionProgress({ swapDetails, gaslessAuthorization })
        || hasUnacknowledgedWalletAction({
            transaction,
            pendingSubmission,
            transactionStatus: inputTransactionStatus,
        });
}
