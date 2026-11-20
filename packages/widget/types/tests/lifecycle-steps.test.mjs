import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SWAP_LIFECYCLE_ATTEMPT_START_STEPS, SWAP_LIFECYCLE_PHASE_STEPS, SWAP_LIFECYCLE_REPEATABLE_STEPS,
  SWAP_LIFECYCLE_TRANSACTION_STEPS, lifecycleObservationFingerprint, lifecycleObservationKey,
} from '../dist/esm/index.js'

const categories = {
  phase: SWAP_LIFECYCLE_PHASE_STEPS,
  transaction: SWAP_LIFECYCLE_TRANSACTION_STEPS,
  repeatable: SWAP_LIFECYCLE_REPEATABLE_STEPS,
}

test('every lifecycle step is in exactly one category and attempt starts are repeatable', () => {
  for (const [name, steps] of Object.entries(categories)) {
    assert.equal(new Set(steps).size, steps.length, `${name} steps are unique`)
    for (const step of steps) {
      const owners = Object.entries(categories).filter(([, other]) => other.includes(step)).map(([owner]) => owner)
      assert.deepEqual(owners, [name], `${step} belongs to exactly one category`)
    }
  }
  // The SwapLifecycleStep type is the union of the three tuples, so a step
  // outside them cannot be emitted: the categories are complete by construction.
  for (const step of SWAP_LIFECYCLE_ATTEMPT_START_STEPS) {
    assert(SWAP_LIFECYCLE_REPEATABLE_STEPS.includes(step), `${step} is a repeatable attempt start`)
  }
})

test('observation keys follow the categories and fingerprints ignore enrichment and swap identity', () => {
  for (const step of SWAP_LIFECYCLE_PHASE_STEPS) assert.equal(lifecycleObservationKey({ step }), 'phase')
  for (const step of SWAP_LIFECYCLE_TRANSACTION_STEPS) assert.equal(lifecycleObservationKey({ step }), step)
  for (const step of SWAP_LIFECYCLE_REPEATABLE_STEPS) assert.equal(lifecycleObservationKey({ step }), undefined)
  const base = { step: 'input_transfer_confirmed', stage: 'input_transfer', outcome: 'succeeded', path: 'test', swapId: 'swap-a', transactionHash: 'tx-a' }
  const fingerprint = lifecycleObservationFingerprint(base)
  for (const enrichment of [{ swapId: 'swap-b' }, { fromAddress: '0xlate' }, { confirmations: 11, maxConfirmations: 10 }, { path: 'other' }, { reason: 'text' }]) {
    assert.equal(lifecycleObservationFingerprint({ ...base, ...enrichment }), fingerprint, JSON.stringify(enrichment))
  }
  for (const advance of [{ transactionHash: 'tx-b' }, { outcome: 'failed' }, { status: 'completed' }, { phase: 'completed' }, { reasonCode: 'timeout' }, { occurrenceId: 'o-1' }, { inputTransactionHash: 'in' }, { outputTransactionHash: 'out' }, { refundTransactionHash: 'refund' }]) {
    assert.notEqual(lifecycleObservationFingerprint({ ...base, ...advance }), fingerprint, JSON.stringify(advance))
  }
})
