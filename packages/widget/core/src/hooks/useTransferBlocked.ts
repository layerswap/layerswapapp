import { useEffect, useLayoutEffect, useRef } from 'react'
import type { TransferBlockedReasonCode } from '@layerswap/widget-types'
import { useCallbacks } from '@/context/callbackProvider'
import type { SwapLifecycleContext } from '@/lib/swapLifecycle'

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Reports that the transfer step is showing a blocking state instead of the
 * send button. Emits once per reason transition, so polling, rerenders and
 * StrictMode replays do not repeat the record. Recovery is visible from the
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

    useEffect(() => {
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
    }, [reasonCode, path])
}
