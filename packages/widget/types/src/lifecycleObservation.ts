import {
  SWAP_LIFECYCLE_PHASE_STEPS, SWAP_LIFECYCLE_TRANSACTION_STEPS,
  type SwapLifecycleEvent, type SwapLifecycleStep, type SwapLifecycleTransactionStep,
} from './logEvents';

const PHASE_STEPS = new Set<SwapLifecycleStep>(SWAP_LIFECYCLE_PHASE_STEPS);
const TRANSACTION_STEPS = new Set<SwapLifecycleStep>(SWAP_LIFECYCLE_TRANSACTION_STEPS);

/** The dedupe slot an observation occupies within one swap, or undefined. */
export type SwapLifecycleObservationKey = 'phase' | SwapLifecycleTransactionStep;

/**
 * Which per-swap slot a lifecycle observation occupies. Every phase step
 * shares one slot (so A → B → A is a recovery while a replayed A is not);
 * each transaction step owns its own slot (interleaved effect replay must not
 * reset a sibling); every other step is unslotted and always delivered.
 *
 * Shared by the host callback, `onTelemetry` and the bridge's Faro recorder so
 * no consumer can be stricter than the public `onSwapLifecycle` contract.
 */
export function lifecycleObservationKey(event: Pick<SwapLifecycleEvent, 'step'>): SwapLifecycleObservationKey | undefined {
  if (PHASE_STEPS.has(event.step)) return 'phase';
  if (TRANSACTION_STEPS.has(event.step)) return event.step as SwapLifecycleTransactionStep;
  return undefined;
}

/**
 * What makes a slotted observation new. Addresses, confirmation counts and
 * other enrichment do not advance the journey; new transactions, outcomes,
 * statuses, phases and failure causes do. The swap id is deliberately not
 * part of it: consumers scope slots per swap themselves.
 */
export function lifecycleObservationFingerprint(event: SwapLifecycleEvent): string {
  return JSON.stringify([
    event.step, event.outcome, event.status, event.phase, event.reasonCode,
    event.occurrenceId, event.transactionHash, event.inputTransactionHash,
    event.outputTransactionHash, event.refundTransactionHash,
  ]);
}
