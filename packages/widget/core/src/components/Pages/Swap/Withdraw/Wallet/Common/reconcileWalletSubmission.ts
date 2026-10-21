import LayerSwapApiClient, { BackendTransactionStatus, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { hasSwapExecutionProgress } from '@/helpers/swapProgress'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'

/** Status checks must not depend on cached swap details or actionable deposit instructions. */
export async function reconcileWalletSubmission({ swapId, sourceAddress, api, setSwapTransaction, onSuccess, confirmedNotSubmitted = false }: {
    swapId: string
    sourceAddress: string
    api: LayerSwapApiClient
    setSwapTransaction: (id: string, status: BackendTransactionStatus, hash: string) => void
    onSuccess: () => void
    /** An explicit user assertion after checking the failed/expired request in their wallet. */
    confirmedNotSubmitted?: boolean
}): Promise<{ outcome: 'submitted'; hash: string } | { outcome: 'retry_unlocked' }> {
    const response = await api.GetSwapAsync(swapId, sourceAddress)
    if (response.error) throw response.error
    const swap = response.data?.swap
    if (swap?.id !== swapId || !Array.isArray(swap.transactions)) throw new Error('Could not check deposit status. Please try again.')
    const liveInputs = swap.transactions.filter(tx => tx.type === TransactionType.Input
        && tx.status !== BackendTransactionStatus.Failed)
    const input = liveInputs.find(tx => !!tx.transaction_hash)
    if (input) {
        setSwapTransaction(swapId, input.status, input.transaction_hash)
        useSwapTransactionStore.getState().clearPendingSubmission(swapId)
        onSuccess()
        return { outcome: 'submitted', hash: input.transaction_hash }
    }
    const store = useSwapTransactionStore.getState()
    const known = store.swapTransactions[swapId]
    // A recorded hash is an identity, unlike a bare unknown-submission marker.
    // Resume it while indexing catches up; retry only its own confirmed failure.
    if (!store.pendingSubmissions[swapId] && known?.hash && known.status !== BackendTransactionStatus.Failed) {
        const failed = swap.transactions.some(tx => tx.type === TransactionType.Input
            && tx.transaction_hash === known.hash && tx.status === BackendTransactionStatus.Failed)
        if (failed && liveInputs.length === 0 && !hasSwapExecutionProgress({
            swapDetails: swap,
            // A completed wallet step is not evidence of a successful deposit
            // after its identified input failed. Preserve other live steps.
            depositActions: response.data?.deposit_actions?.map(action =>
                (action.step === 'deposit' || action.step === 'publish') && action.status === 'completed'
                    ? { ...action, status: 'failed' as const } : action),
            storedWalletTransaction: undefined, gaslessAuthorization: undefined,
        })) {
            setSwapTransaction(swapId, BackendTransactionStatus.Failed, known.hash)
            return { outcome: 'retry_unlocked' }
        }
        onSuccess()
        return { outcome: 'submitted', hash: known.hash }
    }
    // An absent input alone never proves non-submission. Unlock only after the
    // user verifies their wallet, and never while the server reports live progress.
    if (confirmedNotSubmitted && liveInputs.length === 0 && !hasSwapExecutionProgress({
        swapDetails: swap, depositActions: response.data?.deposit_actions,
        storedWalletTransaction: useSwapTransactionStore.getState().swapTransactions[swapId], gaslessAuthorization: undefined,
    })) {
        useSwapTransactionStore.getState().clearPendingSubmission(swapId)
        return { outcome: 'retry_unlocked' }
    }
    throw Object.assign(new Error('Your transaction may already have been submitted. Check your wallet and retry to check deposit status.'), {
        name: 'SubmissionStatusUnknown',
    })
}
