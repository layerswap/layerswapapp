import { useSwapDataState } from '@/context/swap';
import { hasSwapExecutionProgress, hasUnacknowledgedWalletAction } from '@/helpers/swapProgress';
import { useDepositSignatureStore, useGaslessAuthorizationStore, useSwapTransactionStore } from '@/stores/swapTransactionStore';

/** Funding and wallet readiness checks apply only while a new send is safe.
 * Subscribe to receipts as well as API progress to cover the indexing gap. */
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
