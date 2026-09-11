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
