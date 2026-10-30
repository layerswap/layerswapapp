import { advanceLifecycleObservationScope, type LifecycleObservationScope } from '@/lib/lifecycleObservationScope'
import { useEffect, useRef } from 'react'
import { lifecycleObservationFingerprint, type SwapLifecycleEvent } from '@layerswap/widget-types'
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect'
import { useCallbacks } from '@/context/callbackProvider'
import type { SwapLifecycleContext } from '@/lib/swapLifecycle'

/** Observation identity is separate from context enrichment and swap replacement. */
export type ObservedLifecycleEvent = Omit<SwapLifecycleEvent, keyof SwapLifecycleContext>

/**
 * Emits an effect-driven lifecycle observation once per transition of its
 * observation fingerprint (the same fingerprint every consumer dedupes on, see
 * `lifecycleObservationFingerprint` in @layerswap/widget-types).
 * Context/enrichment arriving later (swap id, source address, confirmations)
 * never re-emits for the initial draft; replacing an existing swap re-arms
 * the observation. The latest context is spread in at emission time.
 *
 * Emission is synchronous inside a passive effect so a child's deferred
 * `transfer_blocked` (useTransferBlocked) still follows the parent's phase.
 */
export function useLifecycleObservation(observation: ObservedLifecycleEvent | undefined, context: SwapLifecycleContext | undefined) {
    const { onSwapLifecycle, getLatestLifecycleEvent } = useCallbacks()
    const latest = useRef({ observation, context, onSwapLifecycle })
    useClientLayoutEffect(() => { latest.current = { observation, context, onSwapLifecycle } })
    const scope = useRef<LifecycleObservationScope>({ hasSeenSwap: false })
    const swapId = context?.swapId
    const committed = useRef<string | undefined>(undefined)
    const transition = observation ? lifecycleObservationFingerprint(observation) : undefined
    useEffect(() => {
        // Clearing a swap after a rejected prompt is not a new phase. Still
        // advance the scope so the next real swap gets its own observation.
        const scopeChanged = advanceLifecycleObservationScope(scope.current, swapId)
        if (scopeChanged && swapId) {
            committed.current = undefined
        }
        // Re-arm: A → gone → A is reported again.
        if (!transition) { committed.current = undefined; return }
        // StrictMode replay or an unrelated re-render.
        if (committed.current === transition) return
        const { observation: current, context: currentContext, onSwapLifecycle: emit } = latest.current
        if (!current) return
        const latestEvent = getLatestLifecycleEvent?.()
        const isWaiting = current.step === 'awaiting_wallet_action' || current.step === 'awaiting_user_deposit'
        // A retry can create B and open its wallet prompt before B's ID reaches
        // this effect. Re-arm B, but never rewind that prompt to a waiting phase.
        const progressed = latestEvent?.swapId === swapId && latestEvent && [
            'wallet_prompt_opened', 'wallet_action_rejected', 'wallet_action_failed',
            'transaction_submitted', 'gasless_authorization_submitted',
            'deposit_address_copied', 'input_transaction_detected', 'input_transfer_pending',
            'input_transfer_confirmed', 'output_transfer_pending', 'swap_completed',
        ].includes(latestEvent.step)
        if (scopeChanged && isWaiting && progressed) {
            committed.current = transition
            return
        }
        emit({ ...current, ...currentContext })
        committed.current = transition
    }, [transition, swapId, getLatestLifecycleEvent])
}
