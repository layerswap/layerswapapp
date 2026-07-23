import { useCallback } from 'react'
import { useSwapDataState } from '@/context/swap'
import { useSwapTransactionStore, useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import { BackendTransactionStatus } from '@/lib/apiClients/layerSwapApiClient'
import { gaslessFailureMessage, useGaslessAuthorization } from './useGaslessAuthorization'

export type SwapFailureReason = 'transfer_failed' | 'gasless_deposit_failed'

type UseSwapRetryResult = {
    failureReason: SwapFailureReason | undefined
    canRetry: boolean
    retry: () => void
    gaslessFailureMessage?: string
    canSwitchToStandard: boolean
    switchToStandard: () => void
}

// Detects retryable deposit failures and recovers by clearing the local deposit markers.
export function useSwapRetry(): UseSwapRetryResult {
    const { swapDetails } = useSwapDataState()
    const swapId = swapDetails?.id

    const storedWalletTransaction = useSwapTransactionStore(
        state => swapId ? state.swapTransactions[swapId] : undefined,
    )
    const { failed: gaslessDepositFailed, failureStatus } = useGaslessAuthorization()

    const failureReason: SwapFailureReason | undefined =
        gaslessDepositFailed
            ? 'gasless_deposit_failed'
            : storedWalletTransaction?.status === BackendTransactionStatus.Failed
                ? 'transfer_failed'
                : undefined

    const retry = useCallback(() => {
        if (!swapId) return
        useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        useSwapTransactionStore.getState().removeSwapTransaction(swapId)
        useGaslessPreferenceStore.getState().clearGaslessUnavailable()
    }, [swapId])

    const switchToStandard = useCallback(() => {
        useGaslessPreferenceStore.getState().switchToStandardTransfer()
        retry()
    }, [retry])

    return {
        failureReason,
        canRetry: !!failureReason,
        retry,
        gaslessFailureMessage: failureReason === 'gasless_deposit_failed' ? gaslessFailureMessage(failureStatus) : undefined,
        canSwitchToStandard: failureReason === 'gasless_deposit_failed',
        switchToStandard,
    }
}
