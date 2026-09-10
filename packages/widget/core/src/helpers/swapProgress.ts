import { SwapStatus } from '@layerswap/widget-types'
import type {
    DepositAction,
    GaslessAuthorizationStatus,
    SwapDetails,
} from '@/lib/apiClients/layerSwapApiClient'
import { BackendTransactionStatus, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import type { GaslessAuthorization, SwapTransaction } from '@/stores/swapTransactionStore'

type SwapProgressOptions = {
    swapDetails: SwapDetails | undefined
    depositActions: DepositAction[] | undefined
    storedWalletTransaction: SwapTransaction | undefined
    gaslessAuthorization: GaslessAuthorization | undefined
    gaslessAuthorizationFailed?: boolean
}

const FAILED_AUTHORIZATION_STATUSES: ReadonlySet<GaslessAuthorizationStatus> = new Set([
    'expired',
    'insufficient',
    'rejected',
])

const ADVANCED_SWAP_STATUSES: ReadonlySet<SwapStatus> = new Set([
    SwapStatus.UserTransferDelayed,
    SwapStatus.LsTransferPending,
    SwapStatus.Completed,
    SwapStatus.PendingRefund,
    SwapStatus.Refunded,
])

// Progress means the old swap can still move funds or has already moved beyond user setup.
// Merely creating it, rejecting a wallet prompt, or completing Permit2 approval is safe to
// abandon and must not pin a retry to stale execution preferences.
export function hasSwapExecutionProgress({
    swapDetails,
    depositActions,
    storedWalletTransaction,
    gaslessAuthorization,
    gaslessAuthorizationFailed = false,
}: SwapProgressOptions): boolean {
    if (swapDetails?.status && ADVANCED_SWAP_STATUSES.has(swapDetails.status)) return true

    const hasLiveInputTransaction = swapDetails?.transactions?.some(transaction =>
        transaction.type === TransactionType.Input
        && transaction.status !== BackendTransactionStatus.Failed
        && !!transaction.transaction_hash
    )
    if (hasLiveInputTransaction) return true

    const authorizationFailed = gaslessAuthorizationFailed
        || (!!gaslessAuthorization?.status
            && FAILED_AUTHORIZATION_STATUSES.has(gaslessAuthorization.status))

    // Gasless authorization creates a pending local marker before a transaction hash
    // exists. A terminal authorization must invalidate that placeholder, while a real
    // transaction hash still means the swap can move funds and must be resumed.
    if (storedWalletTransaction
        && storedWalletTransaction.status !== BackendTransactionStatus.Failed
        && (!!storedWalletTransaction.hash || !authorizationFailed)) {
        return true
    }

    if (gaslessAuthorization && !authorizationFailed) return true

    return depositActions?.some(action => {
        if (action.status !== 'pending' && action.status !== 'completed') return false
        if (action.step === 'publish' || action.step === 'deposit') return true
        return action.step === 'sign' && !authorizationFailed
    }) ?? false
}
