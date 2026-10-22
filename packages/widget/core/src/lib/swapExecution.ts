import { resolveSwapFlow, type ResolveSwapFlowInput } from '@/components/utils/resolveSwapFlow'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { BackendTransactionStatus, TransactionType, type SwapDetails } from '@/lib/apiClients/layerSwapApiClient'
import { isTransactionHash } from '@/helpers/atomicBatch'

/** Record backend execution identity and reconcile atomic submissions. */
export function recordSwapExecution(
    swapId: string,
    input: Pick<ResolveSwapFlowInput, 'swapData' | 'depositActions' | 'gaslessAuthorization'> & {
        swapData?: Partial<Pick<SwapDetails, 'id' | 'transactions'>>
    },
): void {
    const store = useSwapTransactionStore.getState()
    const transaction = store.swapTransactions[swapId]
    const { kind } = resolveSwapFlow({ ...input, transaction })
    if ((kind === 'wallet-transfer' || kind === 'frontend-swap' || kind === 'atomic-batch' || kind === 'gasless-deposit')
        && transaction?.kind !== kind) {
        store.setSwapTransactionKind(swapId, kind)
    }

    const currentTransaction = useSwapTransactionStore.getState().swapTransactions[swapId]
    const awaitingInput = !!store.pendingSubmissions[swapId] || !!currentTransaction?.providerSubmissionAccepted
    if (!awaitingInput || input.swapData?.id !== swapId || currentTransaction?.kind !== 'atomic-batch') {
        return
    }
    // An absent or failed input cannot identify the outcome of a lost wallet
    // request. An indexed, submitted input supplies the receipt for both accepted
    // batches and submissions whose wallet response was lost.
    const submittedInput = input.swapData.transactions?.find(transaction => transaction.type === TransactionType.Input
        && (transaction.status === BackendTransactionStatus.Pending || transaction.status === BackendTransactionStatus.Completed)
        && isTransactionHash(transaction.transaction_hash))
    if (submittedInput) {
        store.setSwapTransaction(swapId, submittedInput.transaction_hash, 'atomic-batch')
    }
}
