import { SwapStatus } from '@layerswap/widget-types'
import type {
    DepositAction,
    GaslessAuthorizationResult,
    SwapDetails,
} from '@/lib/apiClients/layerSwapApiClient'
import { BackendTransactionStatus, TransactionStatus, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { isGaslessAuthorizationSubmitted, isGaslessDepositWorkflow } from './gasless'

type SwapProgressOptions = {
    swapDetails: SwapDetails | undefined
    depositActions: DepositAction[] | undefined
    gaslessAuthorizationFailed?: boolean
    authorization?: GaslessAuthorizationResult
    inputTransactionStatus?: TransactionStatus
}

const ADVANCED_SWAP_STATUSES: ReadonlySet<SwapStatus> = new Set([
    SwapStatus.LsTransferPending,
    SwapStatus.Completed,
    SwapStatus.PendingRefund,
    SwapStatus.Refunded,
])

// Only backend observations establish progress. Local recovery records are lookup
// inputs; missing observations must be handled as unresolved by the caller.
export function hasSwapExecutionProgress({
    swapDetails,
    depositActions,
    gaslessAuthorizationFailed = false,
    authorization,
    inputTransactionStatus,
}: SwapProgressOptions): boolean {
    if (swapDetails?.status && ADVANCED_SWAP_STATUSES.has(swapDetails.status)) return true

    const hasLiveInputTransaction = swapDetails?.transactions?.some(transaction =>
        transaction.type === TransactionType.Input
        && transaction.status !== BackendTransactionStatus.Failed
    )
    if (hasLiveInputTransaction) return true

    const selfPaid = isGaslessDepositWorkflow(depositActions) === false
    const authorizationFailed = !selfPaid && (gaslessAuthorizationFailed
        || (!!authorization && ['expired', 'insufficient', 'rejected'].includes(authorization.status)))

    const authorizationTransaction = authorization?.transaction
    if (authorizationTransaction?.transaction_hash
        && authorizationTransaction.status !== BackendTransactionStatus.Failed) return true
    // Initiated means the backend accepted the signature and can still publish it,
    // even when the separately fetched action snapshot still asks for signing.
    if (!selfPaid && (authorization?.status === 'initiated' || isGaslessAuthorizationSubmitted(authorization))) return true

    if (inputTransactionStatus && (inputTransactionStatus === TransactionStatus.Pending || inputTransactionStatus === TransactionStatus.Completed)) return true

    const firstIncompleteIndex = depositActions?.findIndex(action => action.status !== 'completed') ?? -1

    return depositActions?.some((action, index) => {
        if (action.status !== 'pending' && action.status !== 'completed') return false
        // The backend also marks future steps pending; only the current step can have started.
        if (action.status === 'pending' && index !== firstIncompleteIndex) return false
        if (action.step === 'publish' || action.step === 'deposit') return true
        return action.step === 'sign' && !selfPaid && !authorizationFailed
    }) ?? false
}
