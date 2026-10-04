import { useWalletBatchStore, isBatchOutstanding } from '@/stores/walletBatchStore'
import { useCallback } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap'
import { useSwapTransactionStore, useGaslessAuthorizationStore, useDepositSignatureStore } from '@/stores/swapTransactionStore'
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

// Clear failed deposit markers only when the existing attempt can no longer move funds.
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
    const depositSignature = useDepositSignatureStore(state => swapId ? state.signatures[swapId] : undefined)
    const batch = useWalletBatchStore(state => swapId ? state.batches[swapId] : undefined)
    const pendingSubmission = useSwapTransactionStore(state => swapId ? state.pendingSubmissions[swapId] : undefined)
    const { failureReason, gaslessFailureStatus } = useResolvedSwapStatus()

    const hasProgress = hasSwapExecutionProgress({
        swapDetails,
        depositActions: depositActionsResponse,
        storedWalletTransaction,
        pendingSubmission: !!pendingSubmission || isBatchOutstanding(batch),
        gaslessAuthorization,
        depositSignature,
        gaslessAuthorizationFailed: !!gaslessFailureStatus,
    })

    const canRetry = !!swapId && !!failureReason && !hasProgress

    const restart = useCallback((standardTransfer: boolean) => {
        if (!swapId || !failureReason) return
        if (standardTransfer && failureReason !== 'gasless_deposit_failed') return

        // A submission can arrive after render but before the click. Check the stores
        // again before removing evidence or changing the execution preference.
        const transactions = useSwapTransactionStore.getState()
        const authorizations = useGaslessAuthorizationStore.getState()
        const currentAuthorization = authorizations.authorizations[swapId]
        if (hasSwapExecutionProgress({
            swapDetails,
            depositActions: depositActionsResponse,
            storedWalletTransaction: transactions.swapTransactions[swapId],
            pendingSubmission: !!transactions.pendingSubmissions[swapId]
                || isBatchOutstanding(useWalletBatchStore.getState().batches[swapId]),
            gaslessAuthorization: currentAuthorization,
            depositSignature: useDepositSignatureStore.getState().signatures[swapId],
            // Timer expiry belongs to the authorization that produced this render.
            gaslessAuthorizationFailed: currentAuthorization === gaslessAuthorization && !!gaslessFailureStatus,
        })) return

        authorizations.removeGaslessAuthorization(swapId)
        useDepositSignatureStore.getState().removeDepositSignature(swapId)
        transactions.removeSwapTransaction(swapId)
        const preferences = useGaslessPreferenceStore.getState()
        if (standardTransfer) preferences.switchToStandardTransfer()
        else preferences.clearGaslessUnavailable()
        startFreshSwapAttempt()
        useWalletBatchStore.getState().removeBatch(swapId)
    }, [swapId, failureReason, swapDetails, depositActionsResponse, gaslessAuthorization, gaslessFailureStatus, startFreshSwapAttempt])

    const retry = useCallback(() => restart(false), [restart])
    const switchToStandard = useCallback(() => restart(true), [restart])

    return {
        failureReason,
        canRetry,
        retry,
        gaslessFailureMessage: failureReason === 'gasless_deposit_failed' ? gaslessFailureMessage(gaslessFailureStatus) : undefined,
        canSwitchToStandard: canRetry && failureReason === 'gasless_deposit_failed',
        switchToStandard,
    }
}
