import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createCallbackObservations } from '../dist/esm/lib/callbackObservations.js'
import { createWidgetTelemetry } from '../dist/esm/lib/widgetTelemetry.js'
import { createSwapLifecycleTelemetry } from '../../../../apps/bridge/lib/faro-swap-lifecycle.ts'

// The fixture is the cross-consumer contract for onSwapLifecycle dedupe; its
// header documents the invariants and where onTelemetry legitimately differs.
const { sequences } = JSON.parse(readFileSync(new URL('../../types/tests/fixtures/lifecycle-sequences.json', import.meta.url)))
const toEvent = ({ note, ...event }) => ({ stage: 'flow', outcome: 'pending', path: 'fixture', ...event })

/** Runs one sequence through all three consumers and returns the indices each delivered. */
function deliver(events) {
    const host = createCallbackObservations()
    const telemetry = createWidgetTelemetry(() => 0, () => 0)
    const telemetryEvents = []
    telemetry.register(e => telemetryEvents.push(e))
    telemetry.mount(telemetry.createFlow({ form_mode: 'cross-chain' }))
    const faroRecords = []
    const faro = createSwapLifecycleTelemetry({
        captureEvent: (name, attributes) => { faroRecords.push(attributes); return true },
        setSwapContext: () => true,
    })
    const delivered = { host: [], telemetry: [], faro: [] }
    events.forEach((event, index) => {
        const before = { telemetry: telemetryEvents.length, faro: faroRecords.length }
        if (host.lifecycle(event)) delivered.host.push(index)
        telemetry.lifecycle(event)
        // The first lifecycle call also opens the flow (form_viewed); only the step itself counts.
        if (telemetryEvents.slice(before.telemetry).some(e => e.attributes.step === event.step)) delivered.telemetry.push(index)
        faro.record(event)
        if (faroRecords.length > before.faro) delivered.faro.push(index)
    })
    faro.dispose()
    return delivered
}

for (const [name, sequence] of Object.entries(sequences)) {
    test(`lifecycle fixture: ${name}`, () => {
        const events = sequence.events.map(toEvent)
        const delivered = deliver(events)
        const label = consumer => `${name}: ${consumer} delivered ${JSON.stringify(delivered[consumer])}, expected ${JSON.stringify(sequence.delivered[consumer])}`
        assert.deepEqual(delivered.host, sequence.delivered.host, label('host'))
        assert.deepEqual(delivered.telemetry, sequence.delivered.telemetry, label('telemetry'))
        assert.deepEqual(delivered.faro, sequence.delivered.faro, label('faro'))
        // The rule the fixture encodes: host ⊆ faro ⊆ all; telemetry == host once submitted.
        for (const index of delivered.host) assert(delivered.faro.includes(index), `${name}: bridge dropped event ${index} the host delivered`)
        const submittedAt = events.findIndex(event => event.step === 'form_submitted')
        const afterSubmission = index => submittedAt >= 0 && index >= submittedAt && events[index].step !== 'flow_error'
        assert.deepEqual(delivered.telemetry.filter(afterSubmission), delivered.host.filter(afterSubmission), `${name}: telemetry diverged from the host after submission`)
    })
}
