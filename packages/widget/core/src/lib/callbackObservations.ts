import {
    SWAP_LIFECYCLE_ATTEMPT_START_STEPS, lifecycleObservationFingerprint, lifecycleObservationKey,
    type SwapLifecycleEvent, type SwapLifecycleObservationKey, type SwapLifecycleStep,
} from '@layerswap/widget-types'

const ATTEMPT_START_STEPS = new Set<SwapLifecycleStep>(SWAP_LIFECYCLE_ATTEMPT_START_STEPS)
/** Keeps a long session that browses many swaps from growing without bound. */
const MAX_TRACKED_SWAPS = 64

/** Re-inserts the entry so recently observed swaps outlive idle ones (Map order is insertion order). */
function touch<K, V>(map: Map<K, V>, key: K): V | undefined {
    const value = map.get(key)
    if (value === undefined) return undefined
    map.delete(key)
    map.set(key, value)
    return value
}

function evictLeastRecent(map: Map<unknown, unknown>) {
    while (map.size > MAX_TRACKED_SWAPS) map.delete(map.keys().next().value)
}

/** Host callbacks observe transitions, while user actions always remain repeatable. */
export function createCallbackObservations() {
    const lifecycle = new Map<string | undefined, Map<SwapLifecycleObservationKey, string>>()
    const submitted = new Map<string | undefined, boolean>()
    let activeSwapId: string | undefined
    const reset = () => {
        lifecycle.clear()
        // Navigation ends the id-less fallback scope, not known swaps' progress.
        activeSwapId = undefined
        submitted.delete(undefined)
    }

    return {
        reset,
        /** Runs before either telemetry sink: a deferred balance check cannot undo a send. */
        allowTransferBlock(event: SwapLifecycleEvent): boolean {
            if (event.step === 'form_submitted') {
                activeSwapId = undefined
                submitted.delete(undefined)
            }
            if (event.step === 'swap_created') activeSwapId = event.swapId
            const scope = event.swapId ?? activeSwapId
            // An explicit retry can follow a failed input; connection/switch/prompt
            // events alone must never re-arm a submitted swap's balance warning.
            if (event.step === 'retry_requested') submitted.delete(scope)
            if (['transaction_submitted', 'gasless_authorization_submitted', 'input_transaction_detected',
                'input_transfer_pending', 'input_transfer_confirmed', 'output_transfer_pending',
                'output_transaction_detected', 'output_settling', 'swap_completed', 'refund_pending',
                'refund_completed'].includes(event.step)) {
                submitted.set(scope, true)
                evictLeastRecent(submitted)
            }
            return !(event.step === 'transfer_blocked' && event.reasonCode === 'insufficient_balance'
                && touch(submitted, scope))
        },
        lifecycle(event: SwapLifecycleEvent): boolean {
            if (event.step === 'form_submitted') reset()
            if (ATTEMPT_START_STEPS.has(event.step)) lifecycle.delete(event.swapId)

            // The slot and fingerprint are the shared contract every consumer
            // applies (see @layerswap/widget-types lifecycleObservation); this
            // callback only adds the per-swap scope and its LRU bound.
            const key = lifecycleObservationKey(event)
            if (!key) return true
            let observations = touch(lifecycle, event.swapId)
            if (!observations) {
                observations = new Map()
                lifecycle.set(event.swapId, observations)
                evictLeastRecent(lifecycle)
            }
            const fingerprint = lifecycleObservationFingerprint(event)
            if (observations.get(key) === fingerprint) return false
            observations.set(key, fingerprint)
            return true
        },
    }
}
