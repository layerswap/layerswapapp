import { useEffect, useRef } from 'react'
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect'
import type { TransferBlockedReasonCode } from '@layerswap/widget-types'
import { useCallbacks } from '@/context/callbackProvider'
import type { SwapLifecycleContext } from '@/lib/swapLifecycle'


/**
 * Reports that the transfer step is showing a blocking state instead of the
 * send button. Emits once per reason transition, so polling, rerenders and
 * StrictMode replays do not repeat the record. Replacing an existing swap
 * re-arms the observation; a draft receiving its first ID only enriches it.
 * Recovery is visible from the
 * journey's next progress step; no separate "unblocked" event is needed.
 */
export function useTransferBlocked(
    reasonCode: TransferBlockedReasonCode | undefined,
    context: SwapLifecycleContext | undefined,
    path: string,
    reason?: string,
) {
    const { onSwapLifecycle } = useCallbacks()
    const latest = useRef({ context, reason, onSwapLifecycle })
    useClientLayoutEffect(() => { latest.current = { context, reason, onSwapLifecycle } }, [context, reason, onSwapLifecycle])
    const reported = useRef<TransferBlockedReasonCode | undefined>(undefined)

    const previousSwapId = useRef(context?.swapId)
    const swapId = context?.swapId

    useEffect(() => {
        // A draft acquiring its first ID is enrichment. Replacing an existing
        // swap (including returning to a draft) starts a new observation scope.
        if (previousSwapId.current && previousSwapId.current !== swapId) {
            reported.current = undefined
        }
        previousSwapId.current = swapId
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
                stage: 'wallet_action',
                outcome: 'blocked',
                path,
                reasonCode,
                reason: currentReason,
                ...currentContext,
            })
            reported.current = reasonCode
        })
        return () => { disposed = true }
    }, [reasonCode, path, swapId])
}
