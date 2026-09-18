import assert from 'node:assert/strict'
import test from 'node:test'
import { createCallbackObservations } from '../src/lib/callbackObservations.ts'

const status = (swapId, type = 'user_transfer_pending') => ({ type, swapId })
const lifecycle = (swapId, step = 'output_transfer_pending') => ({ step, swapId, stage: 'flow', outcome: 'pending', path: 'test' })

test('recently observed swaps survive eviction while idle swaps are forgotten', () => {
    const observations = createCallbackObservations()
    assert.equal(observations.status(status('swap-0')), true)
    assert.equal(observations.lifecycle(lifecycle('swap-0')), true)
    for (let i = 1; i < 64; i++) {
        observations.status(status(`swap-${i}`))
        observations.lifecycle(lifecycle(`swap-${i}`))
    }
    // A duplicate for the first swap is still recognized and refreshes it.
    assert.equal(observations.status(status('swap-0')), false)
    assert.equal(observations.lifecycle(lifecycle('swap-0')), false)
    observations.status(status('swap-64'))
    observations.lifecycle(lifecycle('swap-64'))
    // swap-1 was the least recently observed entry, so it was evicted, not swap-0.
    assert.equal(observations.status(status('swap-0')), false)
    assert.equal(observations.lifecycle(lifecycle('swap-0')), false)
    assert.equal(observations.status(status('swap-1')), true)
    assert.equal(observations.lifecycle(lifecycle('swap-1')), true)
})
