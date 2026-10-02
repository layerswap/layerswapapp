import { useEffect, useRef } from 'react'
import { lifecycleObservationFingerprint, type SwapLifecycleEvent } from '@layerswap/widget-types'
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect'
import { useCallbacks } from '@/context/callbackProvider'
import type { SwapLifecycleContext } from '@/lib/swapLifecycle'

/** Identity fields of an effect-driven observation; context (swapId, addresses, …) is passed separately and never re-triggers emission. */
export type ObservedLifecycleEvent = Omit<SwapLifecycleEvent, keyof SwapLifecycleContext>

/**
 * Emits an effect-driven lifecycle observation once per transition of its
 * observation fingerprint (the same fingerprint every consumer dedupes on, see
 * `lifecycleObservationFingerprint` in @layerswap/widget-types).
 * Context/enrichment arriving later (swap id, source address, confirmations)
 * never re-emits; the latest context is spread in at emission time.
 *
 * Emission is synchronous inside a passive effect so a child's deferred
 * `transfer_blocked` (useTransferBlocked) still follows the parent's phase.
 */
export function useLifecycleObservation(observation: ObservedLifecycleEvent | undefined, context: SwapLifecycleContext | undefined) {
    const { onSwapLifecycle } = useCallbacks()
    const latest = useRef({ observation, context, onSwapLifecycle })
    useClientLayoutEffect(() => { latest.current = { observation, context, onSwapLifecycle } })
    const committed = useRef<string | undefined>(undefined)
    const transition = observation ? lifecycleObservationFingerprint(observation) : undefined
    useEffect(() => {
        // Re-arm: A → gone → A is reported again.
        if (!transition) { committed.current = undefined; return }
        // StrictMode replay or an unrelated re-render.
        if (committed.current === transition) return
        const { observation: current, context: currentContext, onSwapLifecycle: emit } = latest.current
        if (!current) return
        emit({ ...current, ...currentContext })
        committed.current = transition
    }, [transition])
}
