import {
    SWAP_LIFECYCLE_ATTEMPT_START_STEPS, SWAP_LIFECYCLE_PHASE_STEPS, SWAP_LIFECYCLE_TRANSACTION_STEPS,
    type SwapLifecycleEvent, type SwapLifecycleStep, type SwapStatusEvent,
} from '@layerswap/widget-types'

const PHASE_STEPS = new Set(SWAP_LIFECYCLE_PHASE_STEPS)
const TRANSACTION_STEPS = new Set(SWAP_LIFECYCLE_TRANSACTION_STEPS)
const ATTEMPT_START_STEPS = new Set(SWAP_LIFECYCLE_ATTEMPT_START_STEPS)
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
    const statuses = new Map<string, string>()
    const lifecycle = new Map<string | undefined, Map<SwapLifecycleStep | 'phase', string>>()
    const reset = () => { statuses.clear(); lifecycle.clear() }

    return {
        reset,
        status(event: SwapStatusEvent): boolean {
            const fingerprint = JSON.stringify([event.type, event.phase])
            if (touch(statuses, event.swapId) === fingerprint) return false
            statuses.set(event.swapId, fingerprint)
            evictLeastRecent(statuses)
            return true
        },
        lifecycle(event: SwapLifecycleEvent): boolean {
            if (event.step === 'form_submitted') reset()
            if (ATTEMPT_START_STEPS.has(event.step)) {
                lifecycle.delete(event.swapId)
                // Withdraw may not emit a status between two failed attempts.
                // The same terminal observation then belongs to a new attempt.
                if (event.swapId) statuses.delete(event.swapId)
            }

            // Separate transaction slots survive interleaved effect replay. All
            // phases share a slot so a real A → B → A recovery is still delivered.
            const key = PHASE_STEPS.has(event.step) ? 'phase'
                : TRANSACTION_STEPS.has(event.step) ? event.step : undefined
            if (!key) return true
            let observations = touch(lifecycle, event.swapId)
            if (!observations) {
                observations = new Map()
                lifecycle.set(event.swapId, observations)
                evictLeastRecent(lifecycle)
            }
            // Addresses and confirmation counts enrich context without advancing
            // the journey. New transactions, outcomes and failures do advance it.
            const fingerprint = JSON.stringify([
                event.step, event.outcome, event.status, event.phase, event.reasonCode,
                event.occurrenceId, event.transactionHash, event.inputTransactionHash,
                event.outputTransactionHash, event.refundTransactionHash,
            ])
            if (observations.get(key) === fingerprint) return false
            observations.set(key, fingerprint)
            return true
        },
    }
}
