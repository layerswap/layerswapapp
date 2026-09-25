import assert from 'node:assert/strict'
import test from 'node:test'
import { createCallbackObservations } from '../dist/esm/lib/callbackObservations.js'

const lifecycle = (swapId, step = 'output_transfer_pending') => ({ step, swapId, stage: 'flow', outcome: 'pending', path: 'test' })
const created = swapId => ({ step: 'swap_created', swapId, stage: 'swap_creation', outcome: 'succeeded', path: 'test' })

test('recently observed swaps survive eviction while idle swaps are forgotten', () => {
    const observations = createCallbackObservations()
    observations.lifecycle(created('swap-0'))
    assert.equal(observations.lifecycle(lifecycle('swap-0')), true)
    for (let i = 1; i < 64; i++) {
        observations.lifecycle(created(`swap-${i}`))
        observations.lifecycle(lifecycle(`swap-${i}`))
    }
    // A duplicate for the first swap is still recognized and refreshes it.
    assert.equal(observations.lifecycle(lifecycle('swap-0')), false)
    observations.lifecycle(created('swap-64'))
    observations.lifecycle(lifecycle('swap-64'))
    // swap-1 was the least recently observed entry, so it was evicted, not swap-0.
    assert.equal(observations.lifecycle(lifecycle('swap-0')), false)
    observations.lifecycle(created('swap-1'))
    assert.equal(observations.lifecycle(lifecycle('swap-1')), true)
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
