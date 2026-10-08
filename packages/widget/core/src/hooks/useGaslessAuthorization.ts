import type { DepositAction, GaslessAuthorizationResult, GaslessAuthorizationStatus, SwapDetails } from '@/lib/apiClients/layerSwapApiClient'
import { TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { isGaslessDepositWorkflow } from '@/helpers/gasless'
import { SwapStatus } from '@layerswap/widget-types'

const FAILURE_STATUSES: ReadonlySet<GaslessAuthorizationStatus> = new Set(['expired', 'insufficient', 'rejected'])

// Only a backend observation can fail an authorization. A browser deadline or a
// persisted status cannot establish whether the publishing worker moved funds.
export function useGaslessAuthorization(
    swapDetails: SwapDetails | undefined,
    depositActions?: DepositAction[],
    authorization?: GaslessAuthorizationResult,
) {
    const hasInputTransaction = swapDetails?.transactions?.some(transaction => transaction.type === TransactionType.Input)
    const hasLiveAuthorizationTransaction = authorization?.transaction?.transaction_hash
        && authorization.transaction.status !== 'failed'
    const failureStatus = swapDetails?.status === SwapStatus.UserTransferPending
        && !hasInputTransaction && !hasLiveAuthorizationTransaction && isGaslessDepositWorkflow(depositActions) !== false
        && authorization?.status && FAILURE_STATUSES.has(authorization.status)
        ? authorization.status : undefined
    return { failed: !!failureStatus, failureStatus, expired: failureStatus === 'expired' }
}

export { gaslessFailureMessage } from '@/helpers/gaslessFailureMessage'
