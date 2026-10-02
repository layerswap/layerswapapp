import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  SWAP_LIFECYCLE_ATTEMPT_START_STEPS, SWAP_LIFECYCLE_PHASE_STEPS, SWAP_LIFECYCLE_REPEATABLE_STEPS,
  SWAP_LIFECYCLE_TRANSACTION_STEPS, lifecycleObservationFingerprint, lifecycleObservationKey,
} from '../dist/esm/index.js'

const categories = {
  phase: SWAP_LIFECYCLE_PHASE_STEPS,
  transaction: SWAP_LIFECYCLE_TRANSACTION_STEPS,
  repeatable: SWAP_LIFECYCLE_REPEATABLE_STEPS,
}
const allSteps = Object.values(categories).flat()
const fixture = JSON.parse(readFileSync(new URL('./fixtures/lifecycle-sequences.json', import.meta.url)))

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
  assert.equal(new Set(allSteps).size, allSteps.length)
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

test('the cross-consumer fixture only uses known steps and its expectations respect the delivery invariants', () => {
  const sequences = Object.entries(fixture.sequences)
  assert(sequences.length >= 9)
  for (const [name, sequence] of sequences) {
    const indices = sequence.events.map((_, index) => index)
    for (const event of sequence.events) assert(allSteps.includes(event.step), `${name}: ${event.step} is a lifecycle step`)
    const { host, telemetry, faro } = sequence.delivered
    for (const [consumer, delivered] of Object.entries(sequence.delivered)) {
      assert.deepEqual(delivered, [...new Set(delivered)].sort((a, b) => a - b), `${name}: ${consumer} indices are sorted and unique`)
      for (const index of delivered) assert(indices.includes(index), `${name}: ${consumer} index ${index} exists`)
    }
    for (const index of host) assert(faro.includes(index), `${name}: the bridge is never stricter than the host callback (event ${index})`)
    const submittedAt = sequence.events.findIndex(event => event.step === 'form_submitted')
    const afterSubmission = index => submittedAt >= 0 && index >= submittedAt && sequence.events[index].step !== 'flow_error'
    assert.deepEqual(telemetry.filter(afterSubmission), host.filter(afterSubmission), `${name}: telemetry matches the host once a flow is submitted`)
    for (const index of telemetry) assert(host.includes(index), `${name}: telemetry never delivers what the host drops (event ${index})`)
    if (JSON.stringify(telemetry) !== JSON.stringify(host)) assert(sequence.telemetryNote, `${name}: a telemetry difference must be explained`)
    // Unslotted steps are always delivered by every consumer.
    for (const index of indices) {
      if (lifecycleObservationKey(sequence.events[index]) !== undefined) continue
      assert(host.includes(index) && faro.includes(index), `${name}: unslotted ${sequence.events[index].step} at ${index} is always delivered`)
    }
  }
})
