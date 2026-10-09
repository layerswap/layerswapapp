import { SwapStatus } from '@layerswap/widget-types';
import { useEffect } from 'react'
import { useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { DepositAction, GaslessAuthorizationResult, GaslessAuthorizationStatus, SwapDetails, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { isGaslessAuthorizationForWorkflow, isGaslessDepositWorkflow } from '@/helpers/gasless'

type UseGaslessAuthorizationResult = {
    failed: boolean
    failureStatus?: GaslessAuthorizationStatus
    expired: boolean
}

const FAILURE_STATUSES: ReadonlySet<GaslessAuthorizationStatus> = new Set(['expired', 'insufficient', 'rejected'])

// Only the fetched authorization can fail a swap. Signature deadlines are receipts.
// Takes the swap as a parameter (no context read) so SwapDataProvider can own the single instance.
export function useGaslessAuthorization(
    swapDetails: SwapDetails | undefined,
    depositActions?: DepositAction[],
    fetchedAuthorization?: GaslessAuthorizationResult,
): UseGaslessAuthorizationResult {
    const swapId = swapDetails?.id

    const storedAuthorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )
    const hasInputTransaction = !!swapDetails?.transactions?.some(t => t.type === TransactionType.Input)
    const awaitingDeposit = isGaslessAuthorizationForWorkflow(storedAuthorization, depositActions)
        && !hasInputTransaction
        && swapDetails?.status === SwapStatus.UserTransferPending
    const status = awaitingDeposit ? fetchedAuthorization?.status : undefined
    const failureStatus = status && FAILURE_STATUSES.has(status) ? status : undefined

    const stalePrerequisite = isGaslessDepositWorkflow(depositActions) === false
    useEffect(() => {
        if (swapId && storedAuthorization && (hasInputTransaction || stalePrerequisite)) {
            useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        }
    }, [swapId, storedAuthorization, hasInputTransaction, stalePrerequisite])

    return {
        failed: !!failureStatus,
        failureStatus,
        expired: failureStatus === 'expired',
    }
}

export { gaslessFailureMessage } from '@/helpers/gaslessFailureMessage';
