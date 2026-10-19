import { resolveSwapFlow, type ResolveSwapFlowInput } from '@/components/utils/resolveSwapFlow'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'

/** Persist execution identity from backend data, independently of receipts and progress. */
export function recordSwapExecution(
    swapId: string,
    input: Pick<ResolveSwapFlowInput, 'swapData' | 'depositActions' | 'gaslessAuthorization'>,
): void {
    const { kind } = resolveSwapFlow(input)
    if (kind !== 'wallet-transfer' && kind !== 'frontend-swap' && kind !== 'atomic-batch' && kind !== 'gasless-deposit') {
        return
    }
    const store = useSwapTransactionStore.getState()
    const transaction = store.swapTransactions[swapId]
    if (transaction?.kind !== kind) {
        store.setSwapTransactionKind(swapId, kind)
    }
}
