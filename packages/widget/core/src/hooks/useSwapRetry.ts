import { useCallback } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import { hasSwapExecutionProgress, hasUnacknowledgedWalletAction } from '@/helpers/swapProgress'
import { gaslessFailureMessage } from './useGaslessAuthorization'
import { useResolvedSwapStatus } from './useResolvedSwapStatus'
import type { SwapFailureReason } from '@/components/utils/resolveSwapPhase'
import { getAtomicBatch } from '@/stores/atomicBatchStore'
import { useSwapTransactionStore, useGaslessAuthorizationStore, useDepositSignatureStore } from '@/stores/swapTransactionStore'

export type { SwapFailureReason } from '@/components/utils/resolveSwapPhase'

type UseSwapRetryResult = {
    failureReason: SwapFailureReason | undefined
    canRetry: boolean
    retry: () => void
    gaslessFailureMessage?: string
    canSwitchToStandard: boolean
    switchToStandard: () => void
}

export function useSwapRetry(): UseSwapRetryResult {
    const { swapDetails, depositActionsResponse, atomicBatch, gaslessAuthorization, inputTransactionStatus } = useSwapDataState()
    const { startFreshSwapAttempt } = useSwapDataUpdate()
    const swapId = swapDetails?.id
    const transaction = useSwapTransactionStore(state => swapId ? state.swapTransactions[swapId] : undefined)
    const pendingSubmission = useSwapTransactionStore(state => swapId ? state.pendingSubmissions[swapId] : undefined)
    const authorizationReceipt = useGaslessAuthorizationStore(state => swapId ? state.authorizations[swapId] : undefined)
    const signatureReceipt = useDepositSignatureStore(state => swapId ? state.signatures[swapId] : undefined)
    const { failureReason, gaslessFailureStatus } = useResolvedSwapStatus()
    const hasProgress = hasSwapExecutionProgress({ swapDetails, depositActions: depositActionsResponse, gaslessAuthorization })
    const unacknowledgedAction = hasUnacknowledgedWalletAction({ transaction, pendingSubmission, authorizationReceipt,
        signatureReceipt, transactionStatus: inputTransactionStatus, gaslessAuthorization, depositActions: depositActionsResponse })
    const canRetry = !!swapId && !!failureReason && !hasProgress && !atomicBatch && !unacknowledgedAction

    const restart = useCallback((standardTransfer: boolean) => {
        if (!swapId || !failureReason || getAtomicBatch(swapId)) return
        if (standardTransfer && failureReason !== 'gasless_deposit_failed') return
        if (useGaslessAuthorizationStore.getState().authorizations[swapId] !== authorizationReceipt
            || useDepositSignatureStore.getState().signatures[swapId] !== signatureReceipt) return
        if (hasSwapExecutionProgress({ swapDetails, depositActions: depositActionsResponse, gaslessAuthorization })) return
        if (hasUnacknowledgedWalletAction({
            transaction: useSwapTransactionStore.getState().swapTransactions[swapId],
            authorizationReceipt: useGaslessAuthorizationStore.getState().authorizations[swapId],
            signatureReceipt: useDepositSignatureStore.getState().signatures[swapId],
            pendingSubmission: useSwapTransactionStore.getState().pendingSubmissions[swapId],
            transactionStatus: inputTransactionStatus, gaslessAuthorization, depositActions: depositActionsResponse,
        })) return
        const preferences = useGaslessPreferenceStore.getState()
        if (standardTransfer) preferences.switchToStandardTransfer()
        else preferences.clearGaslessUnavailable()
        // Retain receipts as history; the new swap's fetched data determines its state.
        startFreshSwapAttempt()
    }, [swapId, failureReason, swapDetails, depositActionsResponse, gaslessAuthorization, inputTransactionStatus, authorizationReceipt, signatureReceipt, startFreshSwapAttempt])
    const retry = useCallback(() => restart(false), [restart])
    const switchToStandard = useCallback(() => restart(true), [restart])
    return {
        failureReason, canRetry, retry,
        gaslessFailureMessage: failureReason === 'gasless_deposit_failed' ? gaslessFailureMessage(gaslessFailureStatus) : undefined,
        canSwitchToStandard: canRetry && failureReason === 'gasless_deposit_failed', switchToStandard,
    }
}
