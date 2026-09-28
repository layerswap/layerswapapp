import { isUserRejection } from '@layerswap/wallet-core/errors'
import type { TransferProps } from '@layerswap/widget-types'
import type { ApiResponse } from '@/Models/ApiResponse'
import LayerSwapApiClient, { BackendTransactionStatus, TransactionType, type SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { hasSwapExecutionProgress } from '@/helpers/swapProgress'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'

const api = new LayerSwapApiClient()
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
    const store = useSwapTransactionStore.getState()
    const transaction = store.swapTransactions[swapId]
    if (transaction && transaction.status !== BackendTransactionStatus.Failed) return transaction.hash

    const recordSubmission = (hash: string) => {
        store.setSwapTransaction(swapId, BackendTransactionStatus.Pending, hash)
        return hash
    }

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
        // Backend indexing may lag the provider; absence of a deposit is not proof
        // that it is safe to sign and submit another withdrawal.
        throw Object.assign(new Error('Your withdrawal may already have been submitted. Try again to check its status.'), {
            header: 'Withdrawal status unknown',
        })
    }

    // Claim the swap synchronously before opening a wallet/provider request.
    store.markSubmissionPending(swapId)
    let phase: Parameters<SubmissionCallback>[0] | undefined = 'preparing'
    let hash: string
    try {
        const prepared = await prepare()
        // Providers that do not report submission progress remain conservative.
        phase = undefined
        hash = await execute(prepared, state => {
            // Once submission starts, later progress cannot make retry safe again.
            if (phase !== 'submitting') phase = state
        })
    } catch (error) {
        if (phase === 'preparing' || (phase === undefined && isUserRejection(error))) {
            store.clearPendingSubmission(swapId)
        }
        throw error
    }
    // Record even if the screen closed, and before any UI success callback can fail.
    return recordSubmission(hash)
}
