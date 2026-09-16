import { SWAP_LIFECYCLE_PHASE_STEPS, type SwapLifecycleEvent, type SwapLifecycleStep, type SwapStatusEvent } from '@layerswap/widget-types'

const PHASE_STEPS = new Set(SWAP_LIFECYCLE_PHASE_STEPS)
const TRANSACTION_STEPS = new Set<SwapLifecycleStep>([
    'input_transaction_detected', 'input_transfer_confirmed', 'output_transaction_detected',
])
const ATTEMPT_START_STEPS = new Set<SwapLifecycleStep>([
    'swap_creation_started', 'wallet_connection_started', 'network_switch_started',
    'wallet_prompt_opened', 'retry_requested',
])

/** Host callbacks observe transitions, while user actions always remain repeatable. */
export function createCallbackObservations() {
    const statuses = new Map<string, string>()
    const lifecycle = new Map<string | undefined, Map<SwapLifecycleStep | 'phase', string>>()
    const reset = () => { statuses.clear(); lifecycle.clear() }

    return {
        reset,
        status(event: SwapStatusEvent): boolean {
            const fingerprint = JSON.stringify([event.type, event.phase])
            if (statuses.get(event.swapId) === fingerprint) return false
            statuses.set(event.swapId, fingerprint)
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
            let observations = lifecycle.get(event.swapId)
            if (!observations) {
                observations = new Map()
                lifecycle.set(event.swapId, observations)
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
