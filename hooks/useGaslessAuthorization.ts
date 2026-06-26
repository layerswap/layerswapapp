import { useEffect, useState } from 'react'
import { useSwapDataState } from '@/context/swap'
import { useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { SwapStatus } from '@/Models/SwapStatus'

// Grace beyond valid_before before we declare the authorization expired, so a slightly
// fast client clock can't flag a still-valid authorization as failed at the boundary.
const EXPIRY_GRACE_SECONDS = 30

type UseGaslessAuthorizationResult = {
    /**
     * The signed authorization's validUntil (valid_before) passed and no deposit was ever
     * published by the paymaster — the deposit didn't go through. Driven by a timer scheduled
     * for the deadline, so it flips on time regardless of the swap's polling cadence.
     */
    expired: boolean
}

/**
 * Surfaces the gasless-deposit timeout: after signing + /authorize, the paymaster has until
 * `valid_before` to publish the deposit. If that lapses with no input transaction on the
 * swap, the user is stuck on the processing screen and `expired` lets the UI show an error.
 * Recovery (clearing the deposit markers) is owned by `useSwapRetry`.
 */
export function useGaslessAuthorization(): UseGaslessAuthorizationResult {
    const { swapDetails } = useSwapDataState()
    const swapId = swapDetails?.id

    const gaslessAuthorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )

    const hasInputTransaction = !!swapDetails?.transactions?.some(t => t.type === TransactionType.Input)

    const pendingPublish = !!gaslessAuthorization
        && !hasInputTransaction
        && swapDetails?.status === SwapStatus.UserTransferPending

    // Drive `expired` from a timer rather than reading the clock during render: schedule a
    // flip for the (grace-adjusted) deadline so it fires on time even if the swap stops
    // polling. Re-runs whenever the authorization, the deposit, or the status changes.
    const [expired, setExpired] = useState(false)
    useEffect(() => {
        if (!pendingPublish || !gaslessAuthorization) {
            setExpired(false)
            return
        }
        const deadlineMs = (gaslessAuthorization.validBefore + EXPIRY_GRACE_SECONDS) * 1000
        const msLeft = deadlineMs - Date.now()
        if (msLeft <= 0) {
            setExpired(true)
            return
        }
        setExpired(false)
        const timer = setTimeout(() => setExpired(true), msLeft)
        return () => clearTimeout(timer)
    }, [pendingPublish, gaslessAuthorization])

    // Clear the deadline marker once the deposit lands (no longer needed for retry).
    useEffect(() => {
        if (swapId && gaslessAuthorization && hasInputTransaction) {
            useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        }
    }, [swapId, gaslessAuthorization, hasInputTransaction])

    return { expired }
}
