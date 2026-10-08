import { isUserRejection } from '@layerswap/wallet-core/errors'
import type { ApiResponse, TransferProps } from '@layerswap/widget-types'
import LayerSwapApiClient, { BackendTransactionStatus, TransactionType, type SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { hasSwapExecutionProgress } from '@/helpers/swapProgress'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { reconcileSwap, withSwapReconciliation } from '@/lib/swapReconciliation'

const api = new LayerSwapApiClient()
const activeWithdrawals = new Set<string>()
type SubmissionCallback = NonNullable<TransferProps['onSubmissionStateChange']>

export async function getProviderDepositActions(swapId: string, sourceAddress?: string) {
    const response = await api.GetDepositActionsAsync(swapId, sourceAddress)
    if (response.error) throw response.error
    if (!response.data?.length) throw new Error('No deposit actions')
    return response.data
}

export async function executeProviderWithdrawal<T>({ swapId, sourceAddress, prepare, execute, onReconcile }: {
    swapId: string
    sourceAddress: string
    prepare: () => Promise<T>
    execute: (prepared: T, onSubmissionStateChange: SubmissionCallback) => Promise<string>
    onReconcile: (response: ApiResponse<SwapResponse>) => Promise<unknown>
}): Promise<string> {
    if (activeWithdrawals.has(swapId)) throw new Error('This withdrawal is already in progress.')

    const store = useSwapTransactionStore.getState()
    const transaction = store.swapTransactions[swapId]

    const recordSubmission = (hash: string) => {
        store.setSwapTransaction(swapId, BackendTransactionStatus.Pending, hash)
        return hash
    }

    // Reconciliation and preparation share the session lock, so concurrent retries
    // cannot both confirm a failure and start a new withdrawal.
    activeWithdrawals.add(swapId)
    const submission: { phase: Parameters<SubmissionCallback>[0] | 'reconciling' | undefined } = { phase: 'reconciling' }
    try {
        return await withSwapReconciliation(swapId, async () => {
            if (store.pendingSubmissions[swapId] || transaction) {
                const submissionPending = !!store.pendingSubmissions[swapId]
                const result = await reconcileSwap(swapId, sourceAddress, { transaction, submissionPending }, api)
                const { response } = result
                const submitted = hasSwapExecutionProgress({
                    swapDetails: response.data!.swap,
                    depositActions: response.data!.deposit_actions,
                })
                if (submitted) {
                    const input = response.data!.swap.transactions?.find(tx => tx.type === TransactionType.Input && tx.status !== BackendTransactionStatus.Failed)
                    await onReconcile(response)
                    if (input && useSwapTransactionStore.getState().swapTransactions[swapId] === transaction) {
                        store.clearPendingSubmission(swapId)
                    }
                    return input?.transaction_hash ?? transaction?.hash ?? ''
                }
                await onReconcile(response)
                if (useSwapTransactionStore.getState().swapTransactions[swapId] !== transaction
                    || !!useSwapTransactionStore.getState().pendingSubmissions[swapId] !== submissionPending) {
                    throw new Error('The withdrawal changed while checking its status. Please try again.')
                }
                if (transaction?.hash && result.transactionStatus !== 'failed') return transaction.hash
                const confirmedFailure = result.canRestart && !!transaction?.hash && result.transactionStatus === 'failed'
                // An absent deposit or an unrelated failure cannot establish the
                // outcome of this submission. Require failure of the recorded hash.
                if (!confirmedFailure) {
                    throw Object.assign(new Error('Your withdrawal may already have been submitted. Try again to check its status.'), {
                        header: 'Withdrawal status unknown',
                    })
                }
                store.removeSwapTransaction(swapId)
                store.clearPendingSubmission(swapId)
            }

            // Preparation does not leave a submission marker on reload.
            submission.phase = 'preparing'
            const prepared = await prepare()
            // Providers that do not report submission progress remain conservative.
            submission.phase = undefined
            store.markSubmissionPending(swapId)
            const hash = await execute(prepared, state => {
                // Only a definitive refusal can reverse submission; late progress cannot.
                if (submission.phase === 'submitting' && state !== 'not_submitted') return
                submission.phase = state
                if (state === 'preparing' || state === 'not_submitted') store.clearPendingSubmission(swapId)
                else store.markSubmissionPending(swapId)
            })
            // Record even if the screen closed, before any UI success callback can fail.
            return recordSubmission(hash)
        })
    } catch (error) {
        if (submission.phase === 'preparing' || (submission.phase === undefined && isUserRejection(error))) {
            store.clearPendingSubmission(swapId)
        }
        throw error
    } finally {
        activeWithdrawals.delete(swapId)
    }
}
