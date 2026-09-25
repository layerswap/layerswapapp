import { useCallback } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap'
import { useSwapTransactionStore, useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import { hasSwapExecutionProgress } from '@/helpers/swapProgress'
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
    const { swapDetails, depositActionsResponse } = useSwapDataState()
    const { startFreshSwapAttempt } = useSwapDataUpdate()
    const swapId = swapDetails?.id

    const storedWalletTransaction = useSwapTransactionStore(
        state => swapId ? state.swapTransactions[swapId] : undefined,
    )
    const gaslessAuthorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )
    const { failureReason, gaslessFailureStatus } = useResolvedSwapStatus()

    const hasProgress = hasSwapExecutionProgress({
        swapDetails,
        depositActions: depositActionsResponse,
        storedWalletTransaction,
        gaslessAuthorization,
        gaslessAuthorizationFailed: !!gaslessFailureStatus,
    })

    const retry = useCallback(() => {
        if (!swapId) return
        useGaslessAuthorizationStore.getState().removeGaslessAuthorization(swapId)
        useSwapTransactionStore.getState().removeSwapTransaction(swapId)
        useGaslessPreferenceStore.getState().clearGaslessUnavailable()
        if (!hasProgress) startFreshSwapAttempt()
    }, [swapId, hasProgress, startFreshSwapAttempt])

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
