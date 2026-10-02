import { useCallback } from 'react'
import { useSwapDataState } from '@/context/swap'
import { useSwapTransactionStore, useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import { gaslessFailureMessage } from './useGaslessAuthorization'
import { useResolvedSwapStatus } from './useResolvedSwapStatus'
import type { SwapFailureReason } from '@/components/utils/resolveSwapPhase'

export type { SwapFailureReason } from '@/components/utils/resolveSwapPhase'

type UseSwapRetryResult = {
    failureReason: SwapFailureReason | undefined
    canRetry: boolean
    retry: () => void
    gaslessFailureMessage?: string
    canSwitchToStandard: boolean
    switchToStandard: () => void
}

// Recovers from the retryable deposit failures the resolved status reports by clearing the
// local deposit markers.
export function useSwapRetry(): UseSwapRetryResult {
    const { swapDetails } = useSwapDataState()
    const swapId = swapDetails?.id
    const { failureReason, gaslessFailureStatus } = useResolvedSwapStatus()

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
        gaslessFailureMessage: failureReason === 'gasless_deposit_failed' ? gaslessFailureMessage(gaslessFailureStatus) : undefined,
        canSwitchToStandard: failureReason === 'gasless_deposit_failed',
        switchToStandard,
    }
}
