import { resolveSwapFlow, type ResolveSwapFlowInput } from '@/components/utils/resolveSwapFlow'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { BackendTransactionStatus, TransactionType, type SwapDetails } from '@/lib/apiClients/layerSwapApiClient'
import { isTransactionHash } from '@/helpers/atomicBatch'

/** Record backend execution identity and reconcile uncertain atomic submissions. */
export function recordSwapExecution(
    swapId: string,
    input: Pick<ResolveSwapFlowInput, 'swapData' | 'depositActions' | 'gaslessAuthorization'> & {
        swapData?: Partial<Pick<SwapDetails, 'id' | 'transactions'>>
    },
): void {
    const { kind } = resolveSwapFlow(input)
    const store = useSwapTransactionStore.getState()
    const transaction = store.swapTransactions[swapId]
    if ((kind === 'wallet-transfer' || kind === 'frontend-swap' || kind === 'atomic-batch' || kind === 'gasless-deposit')
        && transaction?.kind !== kind) {
        store.setSwapTransactionKind(swapId, kind)
    }

    if (!store.pendingSubmissions[swapId] || input.swapData?.id !== swapId
        || useSwapTransactionStore.getState().swapTransactions[swapId]?.kind !== 'atomic-batch') {
        return
    }
    // An absent or failed input cannot identify the outcome of a lost wallet
    // request. Only an indexed, submitted input can replace its pending marker.
    const submittedInput = input.swapData.transactions?.find(transaction => transaction.type === TransactionType.Input
        && (transaction.status === BackendTransactionStatus.Pending || transaction.status === BackendTransactionStatus.Completed)
        && isTransactionHash(transaction.transaction_hash))
    if (submittedInput) {
        store.setSwapTransaction(swapId, submittedInput.transaction_hash, 'atomic-batch')
    }
}
