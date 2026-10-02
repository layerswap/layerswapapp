import assert from 'node:assert/strict'
import test from 'node:test'
import {
    createLegacySwapEventRecorder, legacyAttributesFromLifecycle, legacyAttributesFromStatus,
    legacyEventFromLifecycle, legacyEventFromStatus,
} from '../faro-legacy-swap-events.ts'

test('legacy names are derived from the API status alone', () => {
    const table = {
        created: undefined, user_transfer_pending: undefined, ls_transfer_pending: 'swap_pending',
        completed: 'swap_completed', failed: 'swap_failed', expired: 'swap_failed',
        pending_refund: undefined, refunded: undefined,
    }
    for (const [type, name] of Object.entries(table)) assert.equal(legacyEventFromStatus({ type }), name, type)
    // A stray phase on a status event (the shape this replaced) does not make it a completion.
    assert.equal(legacyEventFromStatus({ type: 'ls_transfer_pending', phase: 'completed' }), 'swap_pending')
})

test('legacy names are derived from terminal lifecycle steps', () => {
    const table = {
        swap_completed: 'swap_completed', swap_failed: 'swap_failed', swap_expired: 'swap_failed',
        awaiting_user_deposit: undefined, input_transfer_pending: undefined, output_transfer_pending: undefined,
        output_settling: undefined, refund_pending: undefined, refund_completed: undefined,
        swap_created: undefined, flow_closed: undefined, retry_requested: undefined, wallet_action_rejected: undefined,
    }
    for (const [step, name] of Object.entries(table)) assert.equal(legacyEventFromLifecycle({ step }), name, step)
})

test('both attribute builders emit the same keys; only the lifecycle path carries phase', () => {
    const status = legacyAttributesFromStatus({
        swapId: 's1', type: 'completed', path: 'Processing', fromAddress: '0xa', toAddress: '0xb',
        sourceNetwork: 'A', destinationNetwork: 'B', sourceToken: 'X', destinationToken: 'Y',
    })
    const lifecycle = legacyAttributesFromLifecycle({
        step: 'swap_completed', stage: 'swap', outcome: 'succeeded', path: 'Processing', swapId: 's1',
        status: 'ls_transfer_pending', phase: 'completed', fromAddress: '0xa', toAddress: '0xb',
        sourceNetwork: 'A', destinationNetwork: 'B', sourceToken: 'X', destinationToken: 'Y',
    })
    assert.equal('phase' in status, false)
    assert.deepEqual(Object.keys(lifecycle).filter(key => key !== 'phase').sort(), Object.keys(status).sort())
    assert.deepEqual(status, {
        swap_id: 's1', from_address: '0xa', to_address: '0xb', source_network: 'A', destination_network: 'B',
        source_token: 'X', destination_token: 'Y', status: 'completed', path: 'Processing',
    })
    assert.deepEqual(lifecycle, { ...status, status: 'ls_transfer_pending', phase: 'completed' })
})

function recorder(options = {}) {
    const captures = []
    const contexts = []
    const record = createLegacySwapEventRecorder({
        captureEvent: (name, attributes) => { captures.push([name, attributes]); return options.accept?.(name) ?? true },
        setLegacyContext: attributes => contexts.push(attributes),
        maxEntries: options.maxEntries,
    })
    return { captures, contexts, record: (name, attributes) => record.record(name, attributes) }
}

test('a completion fed by both streams is captured once, whichever stream arrives first', () => {
    const lifecycleFirst = recorder()
    lifecycleFirst.record('swap_completed', { swap_id: 's1', status: 'ls_transfer_pending', phase: 'completed' })
    lifecycleFirst.record('swap_completed', { swap_id: 's1', status: 'completed' })
    assert.deepEqual(lifecycleFirst.captures.map(([name, attributes]) => [name, attributes.status]), [['swap_completed', 'ls_transfer_pending']])
    assert.equal(lifecycleFirst.contexts.length, 1, 'legacy context is set once per capture, before it')

    const statusFirst = recorder()
    statusFirst.record('swap_completed', { swap_id: 's1', status: 'completed' })
    statusFirst.record('swap_completed', { swap_id: 's1', status: 'completed', phase: 'completed' })
    assert.deepEqual(statusFirst.captures.map(([name, attributes]) => [name, attributes.status]), [['swap_completed', 'completed']])
})

test('the dedupe is per name and swap', () => {
    const r = recorder()
    r.record('swap_initiated', { swap_id: 's1' })
    r.record('swap_pending', { swap_id: 's1' })
    r.record('swap_completed', { swap_id: 's1' })
    r.record('swap_pending', { swap_id: 's2' })
    r.record('swap_completed', { swap_id: 's2' })
    r.record('swap_completed', { swap_id: 's1' })
    assert.deepEqual(r.captures.map(([name, attributes]) => `${name}:${attributes.swap_id}`), [
        'swap_initiated:s1', 'swap_pending:s1', 'swap_completed:s1', 'swap_pending:s2', 'swap_completed:s2',
    ])
})

test('a capture the Faro client rejects is not marked emitted', () => {
    let accept = false
    const r = recorder({ accept: () => accept })
    r.record('swap_pending', { swap_id: 's1' })
    assert.equal(r.captures.length, 1)
    accept = true
    r.record('swap_pending', { swap_id: 's1' })
    assert.equal(r.captures.length, 2, 'retried once the client accepts')
    r.record('swap_pending', { swap_id: 's1' })
    assert.equal(r.captures.length, 2)
})

test('the dedupe memory is bounded and keeps recently replayed swaps', () => {
    const r = recorder({ maxEntries: 2 })
    r.record('swap_pending', { swap_id: 'a' })
    r.record('swap_pending', { swap_id: 'b' })
    r.record('swap_pending', { swap_id: 'a' }) // replay refreshes a
    r.record('swap_pending', { swap_id: 'c' }) // evicts b, the least recently observed
    assert.equal(r.captures.length, 3)
    r.record('swap_pending', { swap_id: 'a' })
    assert.equal(r.captures.length, 3, 'a survived the eviction')
    r.record('swap_pending', { swap_id: 'b' })
    assert.equal(r.captures.length, 4, 'b was forgotten and is captured again')
})

test('page_url is attached only when a browser location exists', () => {
    const r = recorder()
    r.record('swap_pending', { swap_id: 's1' })
    assert.equal(r.captures[0][1].page_url, undefined)
    assert.deepEqual(r.contexts[0], { swap_id: 's1' }, 'legacy context receives the attributes without page_url')
})

function trackingRecorder() {
    const captures = []
    const r = createLegacySwapEventRecorder({
        captureEvent: (name, attributes) => { captures.push(`${name}:${attributes.swap_id}`); return true },
        setLegacyContext: () => {},
    })
    return { captures, r }
}

test('opening a finished swap sends nothing: phase observations and onSwapComplete need a watched swap', () => {
    const { captures, r } = trackingRecorder()
    // Reload of /swap/s1 after completion: lifecycle phase step, then onSwapComplete.
    r.observeLifecycle({ step: 'swap_completed', swapId: 's1' })
    r.recordObservation('swap_completed', { swap_id: 's1', phase: 'completed' })
    r.recordObservation('swap_completed', { swap_id: 's1' })
    r.observeLifecycle({ step: 'swap_failed', swapId: 's2' })
    r.recordObservation('swap_failed', { swap_id: 's2', phase: 'failed' })
    assert.deepEqual(captures, [])
})

test('a swap this page created or watched records its phase outcome once', () => {
    const { captures, r } = trackingRecorder()
    r.record('swap_initiated', { swap_id: 's1' })
    r.recordObservation('swap_completed', { swap_id: 's1', phase: 'completed' })
    r.recordObservation('swap_completed', { swap_id: 's1' })
    // Awaiting the user's transfer shows the page following the swap before its outcome.
    r.observeLifecycle({ step: 'awaiting_user_deposit', swapId: 's2' })
    r.recordObservation('swap_failed', { swap_id: 's2', phase: 'failed' })
    assert.deepEqual(captures, ['swap_initiated:s1', 'swap_completed:s1', 'swap_failed:s2'])
})

test('an API status transition is recorded for an opened swap and marks it watched', () => {
    const { captures, r } = trackingRecorder()
    // Opened from history while in progress: the widget baselines the first status and reports
    // only the later change, so the transition is real and the swap becomes watched.
    r.record('swap_completed', { swap_id: 's1', status: 'completed' })
    r.recordObservation('swap_completed', { swap_id: 's1', phase: 'completed' })
    r.recordObservation('swap_failed', { swap_id: 's1', phase: 'failed' })
    assert.deepEqual(captures, ['swap_completed:s1', 'swap_failed:s1'])
})

test('non-tracking lifecycle steps and id-less steps do not mark a swap watched', () => {
    const { captures, r } = trackingRecorder()
    r.observeLifecycle({ step: 'output_transfer_pending', swapId: 's1' })
    r.observeLifecycle({ step: 'flow_closed', swapId: 's1' })
    r.observeLifecycle({ step: 'swap_created', swapId: undefined })
    r.recordObservation('swap_completed', { swap_id: 's1' })
    r.recordObservation('swap_completed', { swap_id: undefined })
    assert.deepEqual(captures, [])
})
