import { useEffect, useRef } from 'react'
import { SwapStatus, type SwapStatusEvent } from '@layerswap/widget-types'
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect'
import { useCallbacks } from '@/context/callbackProvider'
import type { SwapStatusIdentity } from '@/lib/callbackObservations'

/** API statuses hosts are notified about. UI phases (early completion, input-tx failure) belong to onSwapLifecycle. */
export const REPORTED_SWAP_STATUSES: ReadonlySet<SwapStatus> = new Set([
    SwapStatus.LsTransferPending, SwapStatus.Completed, SwapStatus.Failed, SwapStatus.Expired,
])

/** Snapshot fields of a status notification; never part of its identity. */
export type SwapStatusContext = Omit<SwapStatusEvent, keyof SwapStatusIdentity>

/**
 * Reports each API status transition of a swap to the host once per (swapId, type).
 * The signature is the trigger set: only the swap id and the API status can start
 * a notification. Context (path, addresses, route) is read from a ref at emission
 * time, so later enrichment neither re-triggers nor is lost.
 */
export function useSwapStatusNotification(swapId: string | undefined, status: SwapStatus | undefined, context: SwapStatusContext) {
    const { onSwapStatusChange } = useCallbacks()
    const contextRef = useRef(context)
    useClientLayoutEffect(() => { contextRef.current = context })
    useEffect(() => {
        if (!swapId || !status || !REPORTED_SWAP_STATUSES.has(status)) return
        onSwapStatusChange({ swapId, type: status, ...contextRef.current })
    }, [swapId, status, onSwapStatusChange])
}
