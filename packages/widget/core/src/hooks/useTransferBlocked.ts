import { useEffect, useRef } from 'react'
import type { TransferBlockedReasonCode } from '@layerswap/widget-types'
import { useCallbacks } from '@/context/callbackProvider'
import type { SwapLifecycleContext } from '@/lib/swapLifecycle'

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
    latest.current = { context, reason, onSwapLifecycle }
    const reported = useRef<TransferBlockedReasonCode | undefined>(undefined)

    useEffect(() => {
        if (reported.current === reasonCode) return
        reported.current = reasonCode
        if (!reasonCode) return
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
    }, [reasonCode, path])
}
