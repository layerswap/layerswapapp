import { SwapStatus } from '@layerswap/widget-types';
import { useEffect, useState } from 'react'
import { useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { GaslessAuthorizationStatus, SwapDetails, TransactionType } from '@/lib/apiClients/layerSwapApiClient'

// Grace for client clock skew before the fallback timer declares expiry.
const EXPIRY_GRACE_SECONDS = 30

type UseGaslessAuthorizationResult = {
    failed: boolean
    failureStatus?: GaslessAuthorizationStatus
    expired: boolean
}

const FAILURE_STATUSES: ReadonlySet<GaslessAuthorizationStatus> = new Set(['expired', 'insufficient', 'rejected'])

// Poll status is authoritative; the valid_before timer is a fallback until a status arrives.
// Takes the swap as a parameter (no context read) so SwapDataProvider can own the single instance.
export function useGaslessAuthorization(swapDetails: SwapDetails | undefined): UseGaslessAuthorizationResult {
    const swapId = swapDetails?.id

    const authorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )
    const status = authorization?.status

    const hasInputTransaction = !!swapDetails?.transactions?.some(t => t.type === TransactionType.Input)

    const polledFailure: GaslessAuthorizationStatus | undefined =
        status && FAILURE_STATUSES.has(status) ? status : undefined

    const pendingPublish = !!authorization
        && status === undefined
        && !hasInputTransaction
        && swapDetails?.status === SwapStatus.UserTransferPending

    const validBefore = authorization?.validBefore
    const [expiredDeadline, setExpiredDeadline] = useState<{
        swapId: string;
        validBefore: number;
    } | undefined>(undefined)
    useEffect(() => {
        if (!swapId || !pendingPublish || validBefore == null) {
            setExpiredDeadline(undefined)
            return
        }
        const deadlineMs = (validBefore + EXPIRY_GRACE_SECONDS) * 1000
        const msLeft = deadlineMs - Date.now()
        if (msLeft <= 0) {
            setExpiredDeadline({ swapId, validBefore })
            return
        }
        setExpiredDeadline(undefined)
        const timer = setTimeout(() => setExpiredDeadline({ swapId, validBefore }), msLeft)
        return () => clearTimeout(timer)
    }, [swapId, pendingPublish, validBefore])

    useEffect(() => {
        if (swapId && authorization && hasInputTransaction) {
            useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        }
    }, [swapId, authorization, hasInputTransaction])

    // Ignore an obsolete expiry during render, before the effect resets it after a
    // swap change, retry, or authoritative poll result.
    const expiredByTimer = pendingPublish
        && expiredDeadline !== undefined
        && expiredDeadline.swapId === swapId
        && expiredDeadline.validBefore === validBefore
    const failureStatus = polledFailure ?? (expiredByTimer ? 'expired' : undefined)

    return {
        failed: !!failureStatus,
        failureStatus,
        expired: failureStatus === 'expired',
    }
}

export { gaslessFailureMessage } from '@/helpers/gaslessFailureMessage';
