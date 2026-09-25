import { useEffect, useRef } from 'react'
import { type SwapStatus, type SwapStatusEvent } from '@layerswap/widget-types'
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect'
import { useCallbacks } from '@/context/callbackProvider'
import type { SwapStatusIdentity } from '@/lib/swapStatusObserver'

export { REPORTED_SWAP_STATUSES } from '@/lib/swapStatusObserver'

/** Snapshot fields of a status notification; never part of its identity. */
export type SwapStatusContext = Omit<SwapStatusEvent, keyof SwapStatusIdentity>

/**
 * Provider-owned observation of every committed backend status, before notification filtering.
 * The first status seen for a swap only opened from a URL or history is its state
 * at load and is not reported; explicitly created swaps can report their first status.
 * The signature is the trigger set: only the swap id and the API status can start
 * a notification. Context (path, addresses, route) is read from a ref at emission
 * time, so later enrichment neither re-triggers nor is lost.
 */
export function useSwapStatusNotification(swapId: string | undefined, status: SwapStatus | undefined, context: SwapStatusContext) {
    const { onSwapStatusChange } = useCallbacks()
    const contextRef = useRef(context)
    useClientLayoutEffect(() => { contextRef.current = context })
    useEffect(() => {
        if (!swapId || !status) return
        onSwapStatusChange({ swapId, type: status, ...contextRef.current })
    }, [swapId, status, onSwapStatusChange])
}
