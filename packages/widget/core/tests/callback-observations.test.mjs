import assert from 'node:assert/strict'
import test from 'node:test'
import { createCallbackObservations } from '../dist/esm/lib/callbackObservations.js'

const status = (swapId, type = 'user_transfer_pending') => ({ type, swapId })
const lifecycle = (swapId, step = 'output_transfer_pending') => ({ step, swapId, stage: 'flow', outcome: 'pending', path: 'test' })
const created = swapId => ({ step: 'swap_created', swapId, stage: 'swap_creation', outcome: 'succeeded', path: 'test' })

test('recently observed swaps survive eviction while idle swaps are forgotten', () => {
    const observations = createCallbackObservations()
    observations.lifecycle(created('swap-0'))
    assert.equal(observations.status(status('swap-0')), true)
    assert.equal(observations.lifecycle(lifecycle('swap-0')), true)
    for (let i = 1; i < 64; i++) {
        observations.lifecycle(created(`swap-${i}`))
        observations.status(status(`swap-${i}`))
        observations.lifecycle(lifecycle(`swap-${i}`))
    }
    // A duplicate for the first swap is still recognized and refreshes it.
    assert.equal(observations.status(status('swap-0')), false)
    assert.equal(observations.lifecycle(lifecycle('swap-0')), false)
    observations.lifecycle(created('swap-64'))
    observations.status(status('swap-64'))
    observations.lifecycle(lifecycle('swap-64'))
    // swap-1 was the least recently observed entry, so it was evicted, not swap-0.
    assert.equal(observations.status(status('swap-0')), false)
    assert.equal(observations.lifecycle(lifecycle('swap-0')), false)
    observations.lifecycle(created('swap-1'))
    assert.equal(observations.status(status('swap-1')), true)
    assert.equal(observations.lifecycle(lifecycle('swap-1')), true)
})

test('status identity is (swapId, type); every other field is a snapshot that never repeats a delivery', async () => {
    const { SWAP_STATUS_CONTEXT_FIELDS } = await import('../dist/esm/lib/callbackObservations.js')
    const event = {
        swapId: 'swap-a', type: 'ls_transfer_pending', path: 'Processing', fromAddress: '0xa', toAddress: '0xb',
        sourceNetwork: 'A', destinationNetwork: 'B', sourceToken: 'X', destinationToken: 'Y',
    }
    // The fixture is fully populated: every classified context field is present.
    assert.deepEqual([...SWAP_STATUS_CONTEXT_FIELDS].sort(), Object.keys(event).filter(k => k !== 'swapId' && k !== 'type').sort())
    const observations = createCallbackObservations()
    observations.lifecycle(created('swap-a'))
    observations.lifecycle(created('swap-b'))
    assert.equal(observations.status(event), true)
    for (const field of SWAP_STATUS_CONTEXT_FIELDS) {
        assert.equal(observations.status({ ...event, [field]: `${event[field]}-changed` }), false, field)
    }
    assert.equal(observations.status({ ...event, phase: 'completed' }), false, 'an unknown field is not part of the identity')
    assert.equal(observations.status({ ...event, type: 'completed' }), true, 'the API status is identity')
    assert.equal(observations.status({ ...event, type: 'completed' }), false)
    assert.equal(observations.status({ ...event, swapId: 'swap-b' }), true, 'the swap id is identity')
    observations.lifecycle({ step: 'retry_requested', swapId: 'swap-a', stage: 'wallet_action', outcome: 'started', path: 'test' })
    assert.equal(observations.status({ ...event, type: 'completed' }), true, 'a new attempt permits the same status again')
    assert.equal(observations.status({ ...event, swapId: 'swap-b' }), false, 'the retry resets only its own swap')
})

test('the shared observation fingerprint ignores context and enrichment but tracks identity fields', async () => {
    const { lifecycleObservationFingerprint } = await import('@layerswap/widget-types')
    const base = {
        step: 'input_transfer_confirmed', stage: 'input_transfer', outcome: 'succeeded', path: 'Processing',
        swapId: 'swap-a', fromAddress: '0xa', toAddress: '0xb', requestedAmount: '1', sourceNetwork: 'A',
        destinationNetwork: 'B', sourceToken: 'X', destinationToken: 'Y', depositMethod: 'wallet', provider: 'p',
        action: 'a', reason: 'r', errorCode: 'e', confirmations: 1, maxConfirmations: 10,
        status: 'pending', phase: 'input_pending', reasonCode: 'rc', occurrenceId: 'o',
        transactionHash: 'tx', inputTransactionHash: 'in', outputTransactionHash: 'out', refundTransactionHash: 'ref',
    }
    const reference = lifecycleObservationFingerprint(base)
    const context = ['swapId', 'fromAddress', 'toAddress', 'requestedAmount', 'sourceNetwork', 'destinationNetwork',
        'sourceToken', 'destinationToken', 'depositMethod', 'provider', 'action', 'path', 'stage', 'reason', 'errorCode',
        'confirmations', 'maxConfirmations']
    for (const field of context) {
        assert.equal(lifecycleObservationFingerprint({ ...base, [field]: `${base[field]}-changed` }), reference, field)
        const { [field]: _omitted, ...without } = base
        assert.equal(lifecycleObservationFingerprint(without), reference, `${field} removed`)
    }
    const identity = ['step', 'outcome', 'status', 'phase', 'reasonCode', 'occurrenceId', 'transactionHash',
        'inputTransactionHash', 'outputTransactionHash', 'refundTransactionHash']
    for (const field of identity) {
        assert.notEqual(lifecycleObservationFingerprint({ ...base, [field]: `${base[field]}-changed` }), reference, field)
    }
})

test('late context within one swap bucket is absorbed by the host observation store', () => {
    const observations = createCallbackObservations()
    const awaiting = { step: 'awaiting_wallet_action', stage: 'wallet_action', outcome: 'pending', path: 'Withdraw' }
    assert.equal(observations.lifecycle({ ...awaiting, swapId: 'swap-a' }), true)
    assert.equal(observations.lifecycle({ ...awaiting, swapId: 'swap-a', fromAddress: '0xlate', confirmations: 3 }), false)
    assert.equal(observations.lifecycle({ ...awaiting, swapId: undefined }), true)
    assert.equal(observations.lifecycle({ ...awaiting, swapId: undefined, fromAddress: '0xlate' }), false)
    // The bucket is keyed by swap id, so the emitter must not report the same phase again once the id is known.
    assert.equal(observations.lifecycle({ ...awaiting, swapId: 'swap-b' }), true)
})

test('a swap opened in a known status is baselined: only statuses that change afterwards are reported', () => {
    const observations = createCallbackObservations()
    // Reloading /swap/<id> of a finished swap: its status is the state at load, not a transition.
    assert.equal(observations.status(status('swap-a', 'completed')), false)
    assert.equal(observations.status(status('swap-a', 'completed')), false)
    const pending = createCallbackObservations()
    assert.equal(pending.status(status('swap-b', 'ls_transfer_pending')), false)
    assert.equal(pending.status(status('swap-b', 'completed')), true, 'a change observed while open is a transition')
    assert.equal(pending.status(status('swap-b', 'completed')), false)
    // A reset forgets the baseline, so reopening the swap baselines it again.
    pending.reset()
    assert.equal(pending.status(status('swap-b', 'completed')), false)
})

test('a swap this instance created or watched before its transfer reports its first status', () => {
    const observations = createCallbackObservations()
    observations.lifecycle(created('swap-a'))
    // The swap modal opens (and resets the per-attempt dedup) after creation.
    observations.reset()
    assert.equal(observations.status(status('swap-a', 'ls_transfer_pending')), true)
    assert.equal(observations.status(status('swap-a', 'ls_transfer_pending')), false)
    assert.equal(observations.status(status('swap-a', 'completed')), true)

    for (const step of ['awaiting_wallet_action', 'awaiting_user_deposit', 'wallet_prompt_opened', 'retry_requested']) {
        const watched = createCallbackObservations()
        watched.lifecycle(lifecycle('swap-h', step))
        assert.equal(watched.status(status('swap-h', 'ls_transfer_pending')), true, step)
    }
    // Phase observations of a swap that was already past its transfer do not track it.
    const opened = createCallbackObservations()
    opened.lifecycle(lifecycle('swap-o', 'swap_completed'))
    assert.equal(opened.status(status('swap-o', 'completed')), false)
    // Another swap's creation does not track this one.
    opened.lifecycle(created('swap-x'))
    assert.equal(opened.status(status('swap-y', 'completed')), false)
})
