import {
    SWAP_LIFECYCLE_ATTEMPT_START_STEPS, lifecycleObservationFingerprint, lifecycleObservationKey,
    type SwapLifecycleEvent, type SwapLifecycleObservationKey, type SwapLifecycleStep, type SwapStatusEvent,
} from '@layerswap/widget-types'

const ATTEMPT_START_STEPS = new Set<SwapLifecycleStep>(SWAP_LIFECYCLE_ATTEMPT_START_STEPS)
/**
 * Steps that show this widget instance watching a swap before its outcome: it
 * created the swap, showed it awaiting the user's transfer, or the user acted
 * on it. A swap never seen in one of these (opened from a URL or history) is
 * baselined at its first status instead of reported.
 */
const TRACKING_STEPS = new Set<SwapLifecycleStep>([
    'swap_created', 'awaiting_wallet_action', 'awaiting_user_deposit', ...SWAP_LIFECYCLE_ATTEMPT_START_STEPS,
])
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

/** The identity of a status notification: one delivery per (swapId, type) per attempt. */
export type SwapStatusIdentity = Pick<SwapStatusEvent, 'swapId' | 'type'>

/**
 * Every non-identity field of a status notification. These are a snapshot at
 * transition time and never trigger or repeat a delivery. Adding a field to
 * SwapStatusEvent fails check:types until it is classified here.
 */
export const SWAP_STATUS_CONTEXT_FIELDS = Object.keys({
    path: true, fromAddress: true, toAddress: true,
    sourceNetwork: true, destinationNetwork: true, sourceToken: true, destinationToken: true,
} satisfies Record<Exclude<keyof SwapStatusEvent, keyof SwapStatusIdentity>, true>) as readonly Exclude<keyof SwapStatusEvent, keyof SwapStatusIdentity>[]

/** Host callbacks observe transitions, while user actions always remain repeatable. */
export function createCallbackObservations() {
    const statuses = new Map<string, string>()
    const lifecycle = new Map<string | undefined, Map<SwapLifecycleObservationKey, string>>()
    // Outlives reset(): the swap modal opens (and resets) after the swap it shows was created.
    const tracked = new Map<string, true>()
    const reset = () => { statuses.clear(); lifecycle.clear() }

    return {
        reset,
        status(event: SwapStatusIdentity): boolean {
            const fingerprint = event.type
            const isTracked = touch(tracked, event.swapId) !== undefined
            const previous = touch(statuses, event.swapId)
            if (previous === fingerprint) return false
            statuses.set(event.swapId, fingerprint)
            evictLeastRecent(statuses)
            // The first status of a swap this instance only opened is its state
            // at load, not a transition: reloading a finished swap reports nothing.
            return previous !== undefined || isTracked
        },
        lifecycle(event: SwapLifecycleEvent): boolean {
            if (event.step === 'form_submitted') reset()
            if (event.swapId && TRACKING_STEPS.has(event.step)) {
                tracked.set(event.swapId, true)
                evictLeastRecent(tracked)
            }
            if (ATTEMPT_START_STEPS.has(event.step)) {
                lifecycle.delete(event.swapId)
                // Withdraw may not emit a status between two failed attempts.
                // The same terminal observation then belongs to a new attempt.
                if (event.swapId) statuses.delete(event.swapId)
            }

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
