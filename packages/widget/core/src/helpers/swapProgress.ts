import { SwapStatus } from '@layerswap/widget-types'
import type { DepositAction, GaslessAuthorizationResult, SwapDetails } from '@/lib/apiClients/layerSwapApiClient'
import { BackendTransactionStatus, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { isGaslessDepositWorkflow } from './gasless'
import type { DepositSignature, GaslessAuthorization, SwapTransaction } from '@/stores/swapTransactionStore'

type SwapProgressOptions = {
    swapDetails?: SwapDetails
    depositActions?: DepositAction[]
    gaslessAuthorization?: GaslessAuthorizationResult
}

const ADVANCED_SWAP_STATUSES: ReadonlySet<SwapStatus> = new Set([
    SwapStatus.LsTransferPending,
    SwapStatus.Completed,
    SwapStatus.PendingRefund,
    SwapStatus.Refunded,
])

/** Only fetched swap, workflow and authorization data describe execution progress. */
export function hasSwapExecutionProgress({ swapDetails, depositActions, gaslessAuthorization }: SwapProgressOptions): boolean {
    if (swapDetails?.status && ADVANCED_SWAP_STATUSES.has(swapDetails.status)) return true
    if (swapDetails?.transactions?.some(transaction => transaction.type === TransactionType.Input
        && transaction.status !== BackendTransactionStatus.Failed && !!transaction.transaction_hash)) return true
    if (gaslessAuthorization?.transaction?.transaction_hash
        && gaslessAuthorization.transaction.status !== BackendTransactionStatus.Failed) return true
    const authorizationFailed = gaslessAuthorization?.status === 'expired'
        || gaslessAuthorization?.status === 'insufficient' || gaslessAuthorization?.status === 'rejected'
    if (gaslessAuthorization?.status && !authorizationFailed) return true
    const selfPaid = isGaslessDepositWorkflow(depositActions) === false
    const firstIncompleteIndex = depositActions?.findIndex(action => action.status !== 'completed') ?? -1
    return depositActions?.some((action, index) => {
        if (action.status !== 'pending' && action.status !== 'completed') return false
        if (action.status === 'pending' && index !== firstIncompleteIndex) return false
        if (action.step === 'publish' || action.step === 'deposit') return true
        return action.step === 'sign' && !selfPaid && !authorizationFailed
    }) ?? false
}

/** Deduplicate recorded wallet actions until fetched data proves they cannot move funds. */
export function hasUnacknowledgedWalletAction(input: {
    transaction?: SwapTransaction
    authorizationReceipt?: GaslessAuthorization
    signatureReceipt?: DepositSignature
    pendingSubmission?: boolean
    transactionStatus?: { hash: string; status: string }
    gaslessAuthorization?: GaslessAuthorizationResult
    depositActions?: DepositAction[]
}): boolean {
    if (input.pendingSubmission) return true
    if (input.transaction?.hash && !(input.transactionStatus?.hash === input.transaction.hash
        && input.transactionStatus.status === 'failed')) return true
    const authorization = input.gaslessAuthorization
    const failed = authorization?.status === 'expired' || authorization?.status === 'insufficient'
        || authorization?.status === 'rejected'
    if (authorization?.transaction?.transaction_hash && authorization.transaction.status !== 'failed') return true
    if (failed || isGaslessDepositWorkflow(input.depositActions) === false) return false
    return !!input.authorizationReceipt || !!input.signatureReceipt
}
