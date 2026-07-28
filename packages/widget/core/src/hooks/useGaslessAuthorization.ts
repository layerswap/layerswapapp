import { useEffect, useState } from 'react'
import { useSwapDataState } from '@/context/swap'
import { useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { GaslessAuthorizationStatus, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { SwapStatus } from '@/Models/SwapStatus'

// Grace for client clock skew before the fallback timer declares expiry.
const EXPIRY_GRACE_SECONDS = 30

type UseGaslessAuthorizationResult = {
    failed: boolean
    failureStatus?: GaslessAuthorizationStatus
    expired: boolean
}

const FAILURE_STATUSES: ReadonlySet<GaslessAuthorizationStatus> = new Set(['expired', 'insufficient', 'rejected'])

// Poll status is authoritative; the valid_before timer is a fallback until a status arrives.
export function useGaslessAuthorization(): UseGaslessAuthorizationResult {
    const { swapDetails } = useSwapDataState()
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
    const [expiredByTimer, setExpiredByTimer] = useState(false)
    useEffect(() => {
        if (!pendingPublish || validBefore == null) {
            setExpiredByTimer(false)
            return
        }
        const deadlineMs = (validBefore + EXPIRY_GRACE_SECONDS) * 1000
        const msLeft = deadlineMs - Date.now()
        if (msLeft <= 0) {
            setExpiredByTimer(true)
            return
        }
        setExpiredByTimer(false)
        const timer = setTimeout(() => setExpiredByTimer(true), msLeft)
        return () => clearTimeout(timer)
    }, [pendingPublish, validBefore])

    useEffect(() => {
        if (swapId && authorization && hasInputTransaction) {
            useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        }
    }, [swapId, authorization, hasInputTransaction])

    const failureStatus = polledFailure ?? (expiredByTimer ? 'expired' : undefined)

    return {
        failed: !!failureStatus,
        failureStatus,
        expired: failureStatus === 'expired',
    }
}

export function gaslessFailureMessage(status: GaslessAuthorizationStatus | undefined): string {
    switch (status) {
        case 'expired':
            return 'The deposit authorization expired before it was broadcast.'
        case 'insufficient':
            return 'Your balance is insufficient to complete this deposit.'
        case 'rejected':
            return 'The deposit was rejected.'
        default:
            return 'The gasless deposit could not be completed.'
    }
}
