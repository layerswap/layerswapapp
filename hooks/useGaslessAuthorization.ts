import { useCallback, useEffect } from 'react'
import { useSwapDataState } from '@/context/swap'
import { useGaslessAuthorizationStore, useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { SwapStatus } from '@/Models/SwapStatus'

type UseGaslessAuthorizationResult = {
    /**
     * The signed authorization's validUntil (valid_before) passed and no deposit was ever
     * published by the paymaster — the deposit didn't go through. Re-evaluated on every
     * render; while a gasless deposit is pending the swap polls every second, so this flips
     * shortly after the deadline lapses.
     */
    expired: boolean
    /** Clears the deadline + pending markers so the withdraw (sign) screen returns for a re-sign. */
    retry: () => void
}

/**
 * Surfaces the gasless-deposit timeout: after signing + /authorize, the paymaster has until
 * `valid_before` to publish the deposit. If that lapses with no input transaction on the
 * swap, the user is stuck on the processing screen — `expired` lets the UI show an error and
 * `retry` reverts to the sign step.
 */
export function useGaslessAuthorization(): UseGaslessAuthorizationResult {
    const { swapDetails } = useSwapDataState()
    const swapId = swapDetails?.id

    const gaslessAuthorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )

    const hasInputTransaction = !!swapDetails?.transactions?.some(t => t.type === TransactionType.Input)

    const expired = !!gaslessAuthorization
        && !hasInputTransaction
        && swapDetails?.status === SwapStatus.UserTransferPending
        && (Date.now() / 1000) > gaslessAuthorization.validBefore

    const retry = useCallback(() => {
        if (!swapId) return
        useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        useSwapTransactionStore.getState().removeSwapTransaction(swapId)
    }, [swapId])

    // Clear the deadline marker once the deposit lands (no longer needed for retry).
    useEffect(() => {
        if (swapId && gaslessAuthorization && hasInputTransaction) {
            useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        }
    }, [swapId, gaslessAuthorization, hasInputTransaction])

    return { expired, retry }
}
