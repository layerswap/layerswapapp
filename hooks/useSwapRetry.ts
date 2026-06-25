import { useCallback } from 'react'
import { useSwapDataState } from '@/context/swap'
import { useSwapTransactionStore, useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { BackendTransactionStatus } from '@/lib/apiClients/layerSwapApiClient'
import { useGaslessAuthorization } from './useGaslessAuthorization'

export type SwapFailureReason = 'transfer_failed' | 'gasless_authorization_expired'

type UseSwapRetryResult = {
    /** The retryable failure currently affecting the swap, if any. */
    failureReason: SwapFailureReason | undefined
    /** Whether a retry is available (i.e. there is a retryable failure). */
    canRetry: boolean
    /** Recover from the failure: clears the local deposit markers so the swap returns to the deposit (sign/transfer) screen for another attempt. */
    retry: () => void
}

/**
 * Single source of truth for retryable deposit failures and how to recover from them.
 * Both failure modes — an on-chain transfer that failed, and a gasless authorization that
 * expired before the paymaster published — recover the same way: drop the local deposit
 * markers so the swap falls back to the deposit screen for a fresh attempt.
 */
export function useSwapRetry(): UseSwapRetryResult {
    const { swapDetails } = useSwapDataState()
    const swapId = swapDetails?.id

    const storedWalletTransaction = useSwapTransactionStore(
        state => swapId ? state.swapTransactions[swapId] : undefined,
    )
    const { expired: gaslessAuthorizationExpired } = useGaslessAuthorization()

    const failureReason: SwapFailureReason | undefined =
        gaslessAuthorizationExpired
            ? 'gasless_authorization_expired'
            : storedWalletTransaction?.status === BackendTransactionStatus.Failed
                ? 'transfer_failed'
                : undefined

    const retry = useCallback(() => {
        if (!swapId) return
        useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        useSwapTransactionStore.getState().removeSwapTransaction(swapId)
    }, [swapId])

    return { failureReason, canRetry: !!failureReason, retry }
}
