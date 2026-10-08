import { useCallback, useRef, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap'
import { useSwapTransactionStore, useGaslessAuthorizationStore, useDepositSignatureStore } from '@/stores/swapTransactionStore'
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore'
import { hasSwapExecutionProgress } from '@/helpers/swapProgress'
import { gaslessFailureMessage } from './useGaslessAuthorization'
import { useResolvedSwapStatus } from './useResolvedSwapStatus'
import { reconcileSwap, withSwapReconciliation } from '@/lib/swapReconciliation'
import { useSelectedAccount } from '@/context/swapAccounts'
import { useClientLayoutEffect } from './useClientLayoutEffect'

export type { SwapFailureReason } from '@/components/utils/resolveSwapPhase'

export function useSwapRetry() {
    const { swapDetails, swapBasicData, depositActionsResponse, authorizationResponse, inputTransactionStatus, setSwapError } = useSwapDataState()
    const { startFreshSwapAttempt, mutateSwap, mutateDepositActions, mutateAuthorization } = useSwapDataUpdate()
    const swapId = swapDetails?.id
    const account = useSelectedAccount('from', swapBasicData?.source_network.name)
    const scope = `${swapId}:${account?.id}:${account?.address}:${swapDetails?.quote_revision}`
    const currentScope = useRef(scope)
    currentScope.current = scope
    useClientLayoutEffect(() => {
        currentScope.current = scope
        return () => { currentScope.current = '' }
    }, [scope])
    const checking = useRef(false)
    const [isChecking, setChecking] = useState(false)
    const { failureReason, gaslessFailureStatus } = useResolvedSwapStatus()
    const hasProgress = hasSwapExecutionProgress({
        swapDetails, depositActions: depositActionsResponse, authorization: authorizationResponse,
        inputTransactionStatus,
        gaslessAuthorizationFailed: !!gaslessFailureStatus,
    })
    const canRetry = !!swapId && !!failureReason && !hasProgress

    const restart = useCallback(async (standardTransfer: boolean) => {
        if (!swapId || !failureReason || checking.current) return
        if (standardTransfer && failureReason !== 'gasless_deposit_failed') return
        checking.current = true
        setChecking(true)
        setSwapError?.(null)
        try {
            await withSwapReconciliation(swapId, async () => {
                const transactions = useSwapTransactionStore.getState()
                const authorizations = useGaslessAuthorizationStore.getState()
                const signatures = useDepositSignatureStore.getState()
                const evidence = {
                    transaction: transactions.swapTransactions[swapId],
                    authorization: authorizations.authorizations[swapId],
                    signature: signatures.signatures[swapId],
                    submissionPending: !!transactions.pendingSubmissions[swapId],
                }
                const result = await reconcileSwap(swapId, swapDetails?.source_address ?? account?.address, evidence)
                if (currentScope.current !== scope) return
                // Wallet submission can finish while the network check is in flight.
                const latest = useSwapTransactionStore.getState()
                if (latest.swapTransactions[swapId] !== evidence.transaction
                    || !!latest.pendingSubmissions[swapId] !== evidence.submissionPending
                    || useGaslessAuthorizationStore.getState().authorizations[swapId] !== evidence.authorization
                    || useDepositSignatureStore.getState().signatures[swapId] !== evidence.signature) return
                await Promise.all([
                    mutateSwap(result.response, false),
                    mutateDepositActions({ data: result.response.data!.deposit_actions }, false),
                    mutateAuthorization(result.authorization ? { data: result.authorization } : undefined, false),
                ])
                if (!result.canRestart || currentScope.current !== scope) return
                // Re-read after cache updates; do not remove evidence of a concurrent send.
                if (useSwapTransactionStore.getState().swapTransactions[swapId] !== evidence.transaction
                    || !!useSwapTransactionStore.getState().pendingSubmissions[swapId] !== evidence.submissionPending
                    || useGaslessAuthorizationStore.getState().authorizations[swapId] !== evidence.authorization
                    || useDepositSignatureStore.getState().signatures[swapId] !== evidence.signature) return
                authorizations.removeGaslessAuthorization(swapId)
                signatures.removeDepositSignature(swapId)
                transactions.removeSwapTransaction(swapId)
                transactions.clearPendingSubmission(swapId)
                const preferences = useGaslessPreferenceStore.getState()
                if (standardTransfer) preferences.switchToStandardTransfer()
                else preferences.clearGaslessUnavailable()
                startFreshSwapAttempt()
            })
        } catch (error) {
            if (currentScope.current === scope) setSwapError?.((error as Error)?.message || 'Could not check the transfer status. Please try again.')
        } finally {
            checking.current = false
            if (currentScope.current) setChecking(false)
        }
    }, [swapId, failureReason, swapDetails?.source_address, account?.address, scope, mutateSwap, mutateDepositActions, mutateAuthorization, startFreshSwapAttempt, setSwapError])

    const retry = useCallback(() => restart(false), [restart])
    const switchToStandard = useCallback(() => restart(true), [restart])
    return {
        failureReason, canRetry, isChecking, retry,
        gaslessFailureMessage: failureReason === 'gasless_deposit_failed' ? gaslessFailureMessage(gaslessFailureStatus) : undefined,
        canSwitchToStandard: canRetry && failureReason === 'gasless_deposit_failed', switchToStandard,
    }
}
