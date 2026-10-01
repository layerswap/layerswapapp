import { isUserRejection } from '@layerswap/wallet-core/errors'
import type { ApiResponse, TransferProps } from '@layerswap/widget-types'
import LayerSwapApiClient, { BackendTransactionStatus, TransactionType, type SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { hasSwapExecutionProgress } from '@/helpers/swapProgress'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'

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
    if (transaction && transaction.status !== BackendTransactionStatus.Failed) return transaction.hash

    const recordSubmission = (hash: string) => {
        store.setSwapTransaction(swapId, BackendTransactionStatus.Pending, hash)
        return hash
    }

    // Reconciliation and preparation share the session lock, so concurrent retries
    // cannot both confirm a failure and start a new withdrawal.
    activeWithdrawals.add(swapId)
    let phase: Parameters<SubmissionCallback>[0] | 'reconciling' | undefined = 'reconciling'
    try {
        if (store.pendingSubmissions[swapId] || transaction) {
            const response = await api.GetSwapAsync(swapId, sourceAddress)
            if (response.error) throw response.error
            if (response.data?.swap?.id !== swapId) throw new Error('Could not check the withdrawal status. Please try again.')
            const submitted = hasSwapExecutionProgress({
                swapDetails: response.data.swap,
                depositActions: response.data.deposit_actions,
                storedWalletTransaction: undefined,
                gaslessAuthorization: undefined,
            })
            if (submitted) {
                const input = response.data.swap.transactions?.find(tx => tx.type === TransactionType.Input && tx.status !== BackendTransactionStatus.Failed)
                const hash = recordSubmission(input?.transaction_hash ?? '')
                await onReconcile(response)
                return hash
            }
            await onReconcile(response)
            const inputs = response.data.swap.transactions?.filter(tx => tx.type === TransactionType.Input)
            const confirmedFailure = transaction?.hash
                && inputs?.some(tx => tx.transaction_hash === transaction.hash && tx.status === BackendTransactionStatus.Failed)
                && inputs.every(tx => tx.status === BackendTransactionStatus.Failed)
            // An absent deposit or an unrelated failed input cannot establish the
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
        phase = 'preparing'
        const prepared = await prepare()
        // Providers that do not report submission progress remain conservative.
        phase = undefined
        store.markSubmissionPending(swapId)
        const hash = await execute(prepared, state => {
            // Only a definitive refusal can reverse submission; late progress cannot.
            if (phase === 'submitting' && state !== 'not_submitted') return
            phase = state
            if (state === 'preparing' || state === 'not_submitted') store.clearPendingSubmission(swapId)
            else store.markSubmissionPending(swapId)
        })
        // Record even if the screen closed, before any UI success callback can fail.
        return recordSubmission(hash)
    } catch (error) {
        if (phase === 'preparing' || (phase === undefined && isUserRejection(error))) {
            store.clearPendingSubmission(swapId)
        }
        throw error
    } finally {
        activeWithdrawals.delete(swapId)
    }
}
