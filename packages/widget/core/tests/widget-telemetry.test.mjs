import assert from 'node:assert/strict'
import test from 'node:test'
import { createWidgetTelemetry } from '../src/lib/widgetTelemetry.ts'

function setup() {
    let time = 1000
    const events = []
    const telemetry = createWidgetTelemetry(() => time, () => time)
    const unregister = telemetry.register(event => events.push(event))
    const flow = telemetry.createFlow({ form_mode: 'cross-chain', source_network: 'TEST_A' })
    const unmount = telemetry.mount(flow)
    return { telemetry, flow, events, unregister, unmount, advance: n => { time += n } }
}
const event = (step, swapId) => ({ step, swapId, stage: 'flow', outcome: 'pending', path: 'test' })

test('a form starts with real editing, not hydration; repeated keystrokes stay bounded', async () => {
    const { telemetry, events } = setup()
    await Promise.resolve()
    assert.deepEqual(events.map(e => e.attributes.step), ['form_viewed'])
    for (let i = 0; i < 20; i++) telemetry.interaction('form_edited', 'change', true)
    assert.equal(events.filter(e => e.attributes.step === 'form_started').length, 1)
    assert.equal(events.filter(e => e.name === 'widget_interaction').length, 1)
    assert.equal(new Set(events.map(e => e.attributes.event_id)).size, events.length)
})

test('StrictMode layout cleanup/replay emits one form view', async () => {
    const { telemetry, flow, unmount, events } = setup()
    unmount()
    telemetry.mount(flow)
    await Promise.resolve()
    assert.equal(events.filter(e => e.attributes.step === 'form_viewed').length, 1)
})

test('overlapping operations retain their starting flow and unique operation identity', () => {
    const { telemetry, events, advance } = setup()
    const first = telemetry.beginOperation('quote_request')
    advance(25)
    const second = telemetry.beginOperation('quote_request')
    telemetry.mount(telemetry.createFlow({ form_mode: 'exchange' }))
    advance(50)
    first('succeeded'); second('failed'); first('failed')
    const operations = events.filter(e => e.name === 'widget_operation')
    assert.equal(operations.length, 2)
    assert.equal(operations[0].attributes.flow_id, operations[1].attributes.flow_id)
    assert.notEqual(operations[0].attributes.operation_id, operations[1].attributes.operation_id)
    assert.deepEqual(operations.map(e => e.attributes.duration_ms), [75, 50])
})

test('operation completion enriches the captured context with newly available fields', () => {
    const { telemetry, events, advance } = setup()
    const finish = telemetry.beginOperation('swap_creation', { http_status: 202 })
    advance(25)
    finish('succeeded', { swap_id: 'created-swap', http_status: 201 })
    const { attributes } = events.find(event => event.name === 'widget_operation')
    assert.equal(attributes.swap_id, 'created-swap')
    assert.equal(attributes.http_status, 201)
    assert.equal(attributes.source_network, 'TEST_A')
    assert.equal(attributes.duration_ms, 25)
})

test('completion extras cannot replace operation identity, outcome or computed metadata', () => {
    const { telemetry, events, advance } = setup()
    const finish = telemetry.beginOperation('quote_request')
    advance(40)
    finish('failed', {
        operation: 'wallet_transfer', operation_id: 'replacement-operation',
        outcome: 'succeeded', duration_ms: -1, schema_version: 99, event_id: 'replacement-event',
    })
    const { attributes } = events.find(event => event.name === 'widget_operation')
    assert.equal(attributes.operation, 'quote_request')
    assert.ok(attributes.operation_id)
    assert.notEqual(attributes.operation_id, 'replacement-operation')
    assert.equal(attributes.outcome, 'failed')
    assert.equal(attributes.duration_ms, 40)
    assert.equal(attributes.schema_version, 1)
    assert.notEqual(attributes.event_id, 'replacement-event')
})

test('cleanup cannot report late results through a replacement handler', () => {
    const { telemetry, events, unregister } = setup()
    const finish = telemetry.beginOperation('balance_fetch')
    unregister()
    const replacement = []
    telemetry.register(e => replacement.push(e))
    finish('succeeded')
    assert.equal(events.length, 0)
    assert.equal(replacement.length, 0)
})

test('callbacks can throw without breaking operations', () => {
    const telemetry = createWidgetTelemetry()
    telemetry.register(() => { throw new Error('host failed') })
    assert.doesNotThrow(() => telemetry.beginOperation('gas_estimation')('partial'))
})

test('late unrelated swaps cannot complete a form; diagnostics do not advance it', () => {
    const { telemetry, events } = setup()
    telemetry.interaction('submit_swap', 'click', true)
    telemetry.lifecycle(event('form_submitted'))
    telemetry.lifecycle(event('swap_created', 'swap-a'))
    telemetry.lifecycle(event('swap_completed', 'swap-b'))
    telemetry.lifecycle(event('flow_error', 'swap-a'))
    assert.equal(events.at(-1).attributes.step, 'swap_created')
    assert.equal(events.at(-1).attributes.completion_observed, false)
    telemetry.lifecycle(event('input_transaction_detected', 'swap-a'))
    telemetry.lifecycle(event('swap_completed', 'swap-a'))
    assert.equal(events.at(-1).attributes.completion_observed, true)
    assert.equal(events.at(-1).attributes.deposit_observed, true)
})

test('automatic deposit form submission does not manufacture user engagement', () => {
    const { telemetry, events } = setup()
    telemetry.lifecycle(event('form_submitted'))
    assert.equal(events.at(-1).attributes.submitted, true)
    assert.equal(events.at(-1).attributes.form_started, false)
})

test('validation already visible at first interaction is reported once, then only on transitions', () => {
    const { telemetry, events } = setup()
    telemetry.validation('amount_required')
    assert.equal(events.length, 0)
    telemetry.interaction('open_source_picker', 'click', true)
    telemetry.validation('amount_required')
    telemetry.validation(undefined)
    telemetry.validation('amount_required')
    assert.equal(events.filter(e => e.attributes.step === 'validation_shown').length, 2)
})

test('a swap created outside this form cannot attach to an untouched visit', () => {
    const { telemetry, events } = setup()
    telemetry.lifecycle(event('swap_created', 'another-form'))
    telemetry.lifecycle(event('swap_completed', 'another-form'))
    assert.equal(events.length, 0)
})

test('transfer prompt and submission flags separate the wallet step from deposit detection', () => {
    const { telemetry, events } = setup()
    telemetry.interaction('submit_swap', 'click', true)
    telemetry.lifecycle(event('form_submitted'))
    telemetry.lifecycle(event('swap_created', 'swap-a'))
    telemetry.lifecycle(event('awaiting_wallet_action', 'swap-a'))
    assert.equal(events.at(-1).attributes.transfer_prompted, false)
    telemetry.lifecycle({ ...event('transfer_blocked', 'swap-a'), outcome: 'blocked', reasonCode: 'rpc_unhealthy' })
    assert.equal(events.at(-1).attributes.step, 'transfer_blocked')
    assert.equal(events.at(-1).attributes.reason_code, 'rpc_unhealthy')
    assert.equal(events.at(-1).attributes.transfer_submitted, false)
    telemetry.lifecycle(event('wallet_prompt_opened', 'swap-a'))
    assert.equal(events.at(-1).attributes.transfer_prompted, true)
    assert.equal(events.at(-1).attributes.transfer_submitted, false)
    telemetry.lifecycle(event('gasless_authorization_submitted', 'swap-a'))
    assert.equal(events.at(-1).attributes.transfer_submitted, true)
    assert.equal(events.at(-1).attributes.deposit_observed, false)
})

function submittedFlow() {
    const h = setup()
    h.telemetry.lifecycle(event('form_submitted'))
    h.telemetry.lifecycle(event('swap_created', 'swap-a'))
    h.events.length = 0
    return h
}

test('interleaved lifecycle effect replay survives flow cleanup/remount without duplicate observations', () => {
    const { telemetry, flow, unmount, events } = submittedFlow()
    const observations = [
        { ...event('input_transaction_detected', 'swap-a'), transactionHash: 'input-a' },
        { ...event('input_transfer_confirmed', 'swap-a'), transactionHash: 'input-a', outcome: 'succeeded' },
        { ...event('output_transaction_detected', 'swap-a'), transactionHash: 'output-a', outcome: 'succeeded' },
        { ...event('swap_completed', 'swap-a'), phase: 'completed', outcome: 'succeeded' },
    ]
    observations.forEach(telemetry.lifecycle)
    unmount()
    telemetry.mount(flow)
    observations.forEach(telemetry.lifecycle)
    assert.deepEqual(events.map(e => e.attributes.step), observations.map(e => e.step))
    assert.equal(events.at(-1).attributes.deposit_observed, true)
    assert.equal(events.at(-1).attributes.completion_observed, true)
})

test('confirmation-only updates are ignored while transaction, outcome and API status changes survive', () => {
    const { telemetry, events } = submittedFlow()
    const input = { ...event('input_transfer_confirmed', 'swap-a'), outcome: 'succeeded', inputTransactionHash: 'input-a', status: 'completed' }
    const output = { ...event('output_transaction_detected', 'swap-a'), outputTransactionHash: 'output-a', status: 'pending' }
    const completed = { ...event('swap_completed', 'swap-a'), outcome: 'succeeded', phase: 'completed', status: 'ls_transfer_pending' }
    for (const confirmations of [10, 11, 12]) {
        for (const observation of [input, output, completed]) telemetry.lifecycle({ ...observation, confirmations, maxConfirmations: 10 })
    }
    assert.equal(events.length, 3)
    telemetry.lifecycle({ ...output, outcome: 'succeeded', status: 'completed' })
    telemetry.lifecycle({ ...output, outputTransactionHash: 'replacement-output' })
    telemetry.lifecycle({ ...input, inputTransactionHash: 'replacement-input' })
    telemetry.lifecycle({ ...completed, status: 'completed' })
    assert.equal(events.length, 7)
})

test('returning to a previous phase and new failure reasons or occurrences remain visible', () => {
    const { telemetry, events } = submittedFlow()
    for (const step of ['output_transfer_pending', 'swap_delayed', 'output_transfer_pending']) {
        telemetry.lifecycle(event(step, 'swap-a'))
    }
    assert.deepEqual(events.map(e => e.attributes.step), ['output_transfer_pending', 'swap_delayed', 'output_transfer_pending'])
    const failed = { ...event('swap_failed', 'swap-a'), outcome: 'failed', reasonCode: 'reason-a', occurrenceId: 'incident-a' }
    for (const observation of [failed, failed, { ...failed, reasonCode: 'reason-b' }, { ...failed, occurrenceId: 'incident-b' }]) {
        telemetry.lifecycle(observation)
    }
    assert.equal(events.filter(e => e.attributes.step === 'swap_failed').length, 3)
})

test('submissions, wallet attempts, rejections and blocking transitions are repeatable', () => {
    const { telemetry, events } = submittedFlow()
    for (let attempt = 0; attempt < 2; attempt++) telemetry.lifecycle(event('form_submitted'))
    assert.deepEqual(events.map(e => e.attributes.submission_count), [2, 3])
    const failed = { ...event('swap_failed', 'swap-a'), outcome: 'failed' }
    for (let attempt = 0; attempt < 2; attempt++) {
        telemetry.lifecycle(event('wallet_prompt_opened', 'swap-a'))
        telemetry.lifecycle({ ...event('wallet_action_rejected', 'swap-a'), outcome: 'rejected', occurrenceId: `incident-${attempt}` })
        telemetry.lifecycle(failed)
        telemetry.lifecycle(failed)
    }
    telemetry.lifecycle(event('retry_requested', 'swap-a'))
    telemetry.lifecycle(failed)
    telemetry.lifecycle(failed)
    assert.equal(events.filter(e => e.attributes.step === 'wallet_prompt_opened').length, 2)
    assert.equal(events.filter(e => e.attributes.step === 'wallet_action_rejected').length, 2)
    assert.equal(events.filter(e => e.attributes.step === 'swap_failed').length, 3)
    for (const reasonCode of ['rpc_unhealthy', 'insufficient_gas', 'rpc_unhealthy']) {
        telemetry.lifecycle({ ...event('transfer_blocked', 'swap-a'), outcome: 'blocked', reasonCode })
    }
    assert.deepEqual(events.filter(e => e.attributes.step === 'transfer_blocked').map(e => e.attributes.reason_code),
        ['rpc_unhealthy', 'insufficient_gas', 'rpc_unhealthy'])
})

test('a new swap or form gets independent observations and late unrelated swaps remain ignored', () => {
    const { telemetry, events } = submittedFlow()
    telemetry.lifecycle(event('swap_completed', 'swap-a'))
    telemetry.lifecycle(event('swap_created', 'swap-b'))
    telemetry.lifecycle(event('swap_completed', 'swap-b'))
    telemetry.lifecycle(event('swap_completed', 'swap-a'))
    telemetry.lifecycle(event('swap_completed', 'swap-b'))
    assert.deepEqual(events.filter(e => e.attributes.step === 'swap_completed').map(e => e.attributes.swap_id), ['swap-a', 'swap-b'])
    const firstFlowId = events[0].attributes.flow_id
    telemetry.mount(telemetry.createFlow({ form_mode: 'exchange' }))
    telemetry.lifecycle(event('form_submitted'))
    telemetry.lifecycle(event('swap_created', 'swap-a'))
    telemetry.lifecycle(event('swap_completed', 'swap-a'))
    assert.equal(events.at(-1).attributes.step, 'swap_completed')
    assert.notEqual(events.at(-1).attributes.flow_id, firstFlowId)
})

test('observations made without an active handler do not suppress later delivery', () => {
    const { telemetry, unregister, events } = submittedFlow()
    unregister()
    telemetry.lifecycle(event('swap_completed', 'swap-a'))
    telemetry.register(e => events.push(e))
    telemetry.lifecycle(event('swap_completed', 'swap-a'))
    telemetry.lifecycle(event('swap_completed', 'swap-a'))
    assert.equal(events.length, 1)
    assert.equal(events[0].attributes.completion_observed, true)
})
