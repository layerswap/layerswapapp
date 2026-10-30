import { useEffect, useRef } from 'react'
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect'
import { advanceLifecycleObservationScope, type LifecycleObservationScope } from '@/lib/lifecycleObservationScope'
import type { SwapLifecycleStage, TransferBlockedReasonCode } from '@layerswap/widget-types'
import { useCallbacks } from '@/context/callbackProvider'
import type { SwapLifecycleContext } from '@/lib/swapLifecycle'


/**
 * Reports that the transfer step is showing a blocking state instead of the
 * send button. Emits once per reason transition, so polling, rerenders and
 * StrictMode replays do not repeat the record. Replacing an existing swap
 * re-arms the observation; a draft receiving its first ID only enriches it.
 * Recovery is visible from the journey's next progress step; no separate "unblocked" event is needed.
 */
export function useTransferBlocked(
    reasonCode: TransferBlockedReasonCode | undefined,
    context: SwapLifecycleContext | undefined,
    path: string,
    reason?: string,
    stage: SwapLifecycleStage = 'wallet_action',
) {
    const { onSwapLifecycle } = useCallbacks()
    const latest = useRef({ context, reason, onSwapLifecycle })
    useClientLayoutEffect(() => { latest.current = { context, reason, onSwapLifecycle } }, [context, reason, onSwapLifecycle])
    const reported = useRef<TransferBlockedReasonCode | undefined>(undefined)

    const scope = useRef<LifecycleObservationScope>({ hasSeenSwap: false })
    const swapId = context?.swapId

    useEffect(() => {
        if (advanceLifecycleObservationScope(scope.current, swapId)) {
            reported.current = undefined
        }
        if (!reasonCode) {
            reported.current = undefined
            return
        }
        if (reported.current === reasonCode) return

        // Let parent phase effects run first so this specific block stays current.
        // Cancel discarded effects without marking the reason as already reported.
        let disposed = false
        queueMicrotask(() => {
            if (disposed) return
            const { context: currentContext, reason: currentReason, onSwapLifecycle: emit } = latest.current
            emit({
                step: 'transfer_blocked',
                stage,
                outcome: 'blocked',
                path,
                reasonCode,
                reason: currentReason,
                ...currentContext,
            })
            reported.current = reasonCode
        })
        return () => { disposed = true }
    }, [reasonCode, path, swapId, stage])
}
