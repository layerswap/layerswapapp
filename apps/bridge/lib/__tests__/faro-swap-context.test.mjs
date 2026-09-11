import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
import { createSwapContextWriter, createWalletContextWriter, SwapContextInstrumentation } from '../faro-session-context.ts'
import { createSwapLifecycleTelemetry } from '../faro-swap-lifecycle.ts'
import { beforeSend } from '../faro-sanitizer.ts'

const require = createRequire(import.meta.url)
const sdkRequire = createRequire(require.resolve('@grafana/faro-web-sdk'))
const coreDir = dirname(sdkRequire.resolve('@grafana/faro-core'))
const { initializeMetas } = require(join(coreDir, 'metas/initialize.js'))
const { initializeMetaAPI } = require(join(coreDir, 'api/meta/initialize.js'))
const { initializeFaro, BaseInstrumentation } = sdkRequire('@grafana/faro-core')
const { mockConfig } = require(join(coreDir, 'testUtils/mockConfig.js'))
const logger = { debug() {}, error() {}, warn() {} }

function harness() {
    // Real installed SDK metadata API, not browser/storage evidence.
    const metas = initializeMetas(console, logger, {})
    const api = initializeMetaAPI({ metas, internalLogger: logger })
    const listen = fn => metas.addListener(fn)
    const write = createSwapContextWriter(api, listen)
    api.setSession({ id: 'test-session', overrides: { serviceName: 'test-service' }, attributes: {
        isSampled: 'true', previousSession: 'test-previous', journey_id: 'persisted-journey',
        swap_id: 'persisted-swap', reason: 'stale', connected_wallets: '[]', custom_host: 'keep',
    } })
    const records = []
    let accepts = true
    const controller = createSwapLifecycleTelemetry({
        setSwapContext: (attrs, options) => write(Object.fromEntries(Object.entries(attrs)
            .filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)])), options?.replaceAttributes),
        captureEvent: (name, attrs) => {
            records.push({ name, attrs: structuredClone(attrs), meta: structuredClone(metas.value) })
            return accepts
        },
    })
    return { api, metas, write, controller, records, listen, attrs: () => api.getSession().attributes,
        reject: () => { accepts = false } }
}
const event = (step, swapId, extra = {}) => ({ step, swapId, stage: 'flow', outcome: 'pending', path: 'unit-test', ...extra })

test('stored flow-close fixture retains closing context and wallet/session equality after cleanup', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../grafana/fixtures/faro-flow-close-loki-observed.json', import.meta.url)))
    assert.equal(fixture.verification, 'Verified in Loki')
    assert.equal(fixture.afterClientTimeRecords, 43)
    assert.equal(fixture.cleanedContextRecords, 43)
    assert.equal(fixture.oldContextRetainedRecords, 0)
    const closing = fixture.closed.parsedFields
    assert.equal(closing.event_data_step, 'flow_closed')
    assert.equal(closing.event_data_swap_id, closing.session_attr_swap_id)
    assert.equal(closing.event_data_journey_id, closing.session_attr_journey_id)
    for (const record of fixture.afterExamples) {
        assert(BigInt(record.timestampNs) > BigInt(fixture.closed.timestampNs))
        assert.equal(record.parsedFields.session_id, closing.session_id)
        assert.equal(record.parsedFields.session_attr_connected_wallets, closing.session_attr_connected_wallets)
        assert(!('session_attr_swap_id' in record.parsedFields))
        assert(!('session_attr_journey_id' in record.parsedFields))
    }
})

test('SDK instrumentation registration clears restored metadata before startup events enqueue', () => {
    const sent = []
    let write
    class RestoreTestSession extends BaseInstrumentation {
        name = 'test-restore-session'
        version = 'test'
        initialize() {
            this.api.setSession({ id: 'test-restored', attributes: { swap_id: 'stale-swap',
                journey_id: 'stale-journey', connected_wallets: '[]', isSampled: 'true' } })
            this.api.pushEvent('test-session-resume')
        }
    }
    const faro = initializeFaro(mockConfig({
        instrumentations: [new SwapContextInstrumentation(writer => { write = writer }), new RestoreTestSession()],
        transports: [{ name: 'test-memory', version: 'test', isBatched: () => false, send: item => sent.push(item) }],
    }))
    assert.equal(sent.length, 1)
    assert.equal(sent[0].meta.session.id, 'test-restored')
    assert.equal(sent[0].meta.session.attributes.swap_id, undefined)
    assert.equal(sent[0].meta.session.attributes.connected_wallets, '[]')
    write({ swap_id: 'current-swap', journey_id: 'current-journey' }, true)
    faro.api.pushEvent('test-current-event')
    write({}, true)
    assert.equal(sent[1].meta.session.attributes.swap_id, 'current-swap')
    assert.equal(faro.api.getSession().attributes.swap_id, undefined)
})

test('SDK restore clears stale swap before startup snapshot; preserves wallets and session identity', () => {
    const h = harness()
    assert.equal(h.attrs().swap_id, undefined)
    assert.equal(h.attrs().journey_id, undefined)
    assert.equal(h.attrs().reason, undefined)
    assert.equal(h.attrs().isSampled, 'true')
    assert.equal(h.attrs().previousSession, 'test-previous')
    assert.equal(h.attrs().connected_wallets, '[]')
    assert.equal(h.api.getSession().id, 'test-session')
    assert.equal(h.api.getSession().overrides.serviceName, 'test-service')
})

test('same-swap legacy merges preserve journey; different-swap legacy replaces old context', () => {
    const h = harness()
    h.write({ swap_id: 'swap-a', journey_id: 'journey-a', reason: 'old', requested_amount: '0.01' }, true)
    h.write({ swap_id: 'swap-a', status: 'pending' })
    assert.equal(h.attrs().journey_id, 'journey-a')
    assert.equal(h.attrs().requested_amount, '0.01')
    h.write({ swap_id: 'swap-b', status: 'pending' })
    assert.equal(h.attrs().journey_id, undefined)
    assert.equal(h.attrs().reason, undefined)
    assert.equal(h.attrs().requested_amount, undefined)
    assert.equal(h.attrs().swap_id, 'swap-b')
})

test('flow close emits its contextual record before cleanup, without changing previously queued snapshots', () => {
    const h = harness()
    h.controller.record(event('form_submitted'))
    h.controller.record(event('swap_created', 'swap-a', { requestedAmount: '0.01' }))
    const journey = h.attrs().journey_id
    h.controller.record(event('swap_completed', 'swap-a', { outcome: 'succeeded' }))
    assert.equal(h.attrs().journey_id, journey, 'terminal result still being viewed retains context')
    h.controller.record(event('flow_closed', 'swap-a'))
    const closed = h.records.at(-1)
    assert.equal(closed.meta.session.attributes.swap_id, 'swap-a')
    assert.equal(closed.attrs.journey_id, journey)
    assert.equal(h.attrs().swap_id, undefined)
    h.controller.setLegacyContext({ swap_id: 'swap-a', status: 'completed' })
    h.controller.record(event('output_settling', 'swap-a'))
    assert.equal(h.attrs().swap_id, undefined, 'late closed-swap updates cannot restore context')
    assert.equal(closed.meta.session.attributes.swap_id, 'swap-a', 'batched historical snapshot survives clearing')
    h.controller.dispose()
})

test('late known-swap lifecycle/legacy callbacks cannot overwrite a newer journey', () => {
    const h = harness()
    h.controller.record(event('swap_created', 'swap-a'))
    h.controller.record(event('form_submitted'))
    h.controller.record(event('swap_created', 'swap-b'))
    const current = structuredClone(h.attrs())
    h.controller.record(event('swap_failed', 'swap-a'))
    h.controller.setLegacyContext({ swap_id: 'swap-a', status: 'failed' })
    assert.deepEqual(h.attrs(), current)
    assert.equal(h.records.at(-1).attrs.swap_id, 'swap-a', 'old event retains its own identity')
    h.controller.dispose()
})

test('rejection and recoverable errors retain current context; new form starts a clean journey', () => {
    const h = harness()
    h.controller.record(event('swap_created', 'swap-a'))
    const journey = h.attrs().journey_id
    for (const step of ['wallet_action_rejected', 'flow_error']) {
        h.controller.record(event(step, 'swap-a', { reason: 'test-reason' }))
        assert.equal(h.attrs().journey_id, journey)
    }
    h.controller.record(event('form_submitted'))
    assert.notEqual(h.attrs().journey_id, journey)
    assert.equal(h.attrs().swap_id, '')
    assert.equal(h.attrs().reason, undefined)
    h.controller.dispose()
})

test('timers are cancelled on departure/unmount and late callbacks are inert', t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
    const h = harness()
    h.controller.record(event('wallet_connection_started'))
    h.controller.record(event('form_submitted'))
    t.mock.timers.tick(120001)
    assert(!h.records.some(r => r.attrs.step === 'suspected_stall'))
    h.controller.record(event('wallet_connection_started'))
    h.controller.dispose()
    const count = h.records.length
    t.mock.timers.tick(120001)
    h.controller.record(event('swap_created', 'late-swap'))
    assert.equal(h.records.length, count)
    assert.equal(h.attrs().journey_id, undefined)
    h.controller.resume()
    h.controller.record(event('form_submitted'))
    assert(h.attrs().journey_id, 'effect remount can start recording again')
    h.controller.dispose()
})

test('close clears context even if capture is unavailable; explicit reopening can own a new journey', () => {
    const h = harness()
    h.controller.record(event('swap_created', 'swap-a'))
    const original = h.attrs().journey_id
    h.reject()
    h.controller.record(event('flow_closed', 'swap-a'))
    assert.equal(h.attrs().journey_id, undefined)
    h.controller.openFlow()
    h.controller.record(event('swap_created', 'swap-a'))
    assert.equal(h.attrs().swap_id, 'swap-a')
    assert.notEqual(h.attrs().journey_id, original)
    h.controller.dispose()
})

test('SDK session adoption and independent wallet updates preserve current-page swap ownership', () => {
    const h = harness()
    const walletWrite = createWalletContextWriter(h.api, h.listen)
    walletWrite({ connected_wallets: '[{"wallet_address":"test-wallet"}]', connected_wallet_count: '1' })
    h.write({ swap_id: 'swap-a', journey_id: 'journey-a' }, true)
    h.api.setSession({ id: 'rotated-session', attributes: { isSampled: 'false',
        journey_id: 'foreign-journey', swap_id: 'foreign-swap', connected_wallets: 'foreign-wallet' } })
    assert.equal(h.api.getSession().id, 'rotated-session')
    assert.equal(h.attrs().isSampled, 'false')
    assert.equal(h.attrs().journey_id, 'journey-a')
    assert.equal(h.attrs().swap_id, 'swap-a')
    assert.equal(h.attrs().connected_wallets, '[{"wallet_address":"test-wallet"}]')
    h.controller.dispose()
    assert.equal(h.attrs().swap_id, undefined)
    assert.equal(h.attrs().connected_wallet_count, '1')
})

test('different-swap legacy ownership retires prior lifecycle, not just its current fields', () => {
    const h = harness()
    h.controller.record(event('swap_created', 'swap-a', { reason: 'old' }))
    h.controller.setLegacyContext({ swap_id: 'swap-b', status: 'pending' })
    assert.equal(h.attrs().journey_id, undefined)
    assert.equal(h.attrs().reason, undefined)
    h.controller.record(event('swap_failed', 'swap-a'))
    assert.equal(h.attrs().swap_id, 'swap-b')
    h.controller.record(event('output_settling', 'swap-b'))
    assert.equal(h.attrs().swap_id, 'swap-b')
    assert(h.attrs().journey_id)
    h.controller.dispose()
})

test('modal close clears pre-creation context and cannot clear a newly opened flow', async () => {
    const h = harness()
    h.controller.record(event('form_submitted'))
    h.controller.closeFlow()
    await Promise.resolve()
    assert.equal(h.attrs().journey_id, undefined)
    h.controller.openFlow()
    h.controller.record(event('form_submitted'))
    h.controller.closeFlow()
    h.controller.openFlow()
    h.controller.record(event('form_submitted'))
    const current = h.attrs().journey_id
    await Promise.resolve()
    assert.equal(h.attrs().journey_id, current)
    h.controller.dispose()
})

test('modal callback ordering preserves synchronous closing event before deferred cleanup', async () => {
    const h = harness()
    h.controller.record(event('swap_created', 'swap-a'))
    h.controller.closeFlow()
    h.controller.record(event('flow_closed', 'swap-a'))
    assert.equal(h.records.at(-1).meta.session.attributes.swap_id, 'swap-a')
    await Promise.resolve()
    assert.equal(h.attrs().swap_id, undefined)
    h.controller.dispose()
})

test('a blocked transfer step keeps its journey, forwards codes, repeats after recovery and can stall', t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
    const h = harness()
    h.controller.record(event('swap_created', 'swap-a', { sourceNetwork: 'TEST_NET' }))
    h.controller.record(event('awaiting_wallet_action', 'swap-a'))
    const journey = h.attrs().journey_id
    const blocked = { step: 'transfer_blocked', stage: 'wallet_action', outcome: 'blocked', path: 'TransferTokenButton', reasonCode: 'rpc_unhealthy', reason: 'probe failed' }
    h.controller.record(blocked)
    let last = h.records.at(-1).attrs
    assert.equal(last.step, 'transfer_blocked')
    assert.equal(last.journey_id, journey)
    assert.equal(last.swap_id, 'swap-a')
    assert.equal(last.reason_code, 'rpc_unhealthy')
    assert.equal(last.previous_step, 'awaiting_wallet_action')
    // Duplicate observations of the same block are still one record per transition in the widget;
    // the controller keeps distinct transitions, including a re-block after recovery.
    h.controller.record(event('wallet_prompt_opened', 'swap-a'))
    h.controller.record(blocked)
    assert.equal(h.records.filter(r => r.attrs.step === 'transfer_blocked').length, 2)
    // A user left on a blocking message long enough becomes a suspected stall on that step.
    t.mock.timers.tick(10 * 60_000 + 1)
    last = h.records.at(-1).attrs
    assert.equal(last.step, 'suspected_stall')
    assert.equal(last.stalled_step, 'transfer_blocked')
    assert.equal(last.reason_code, 'transfer_blocked_timeout')
    // Raw provider codes travel next to the normalized reason on failures.
    h.controller.record(event('wallet_action_failed', 'swap-a', { outcome: 'failed', reasonCode: 'insufficient_funds', errorCode: '-32000' }))
    last = h.records.at(-1).attrs
    assert.equal(last.reason_code, 'insufficient_funds')
    assert.equal(last.error_code, '-32000')
    h.controller.dispose()
})

test('generic flow diagnostics preserve route context and do not cancel progress timers or create journeys', t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
    const h = harness()
    h.controller.record(event('flow_error', undefined, { reason: 'background diagnostic' }))
    assert.equal(h.attrs().journey_id, undefined)
    assert.equal(h.records.at(-1).attrs.journey_id, undefined)
    h.controller.record(event('wallet_prompt_opened', 'swap-a', { requestedAmount: '12', destinationNetwork: 'DEST', toAddress: 'test-destination' }))
    const context = structuredClone(h.attrs())
    t.mock.timers.tick(60000)
    h.controller.record(event('flow_error', 'swap-a', { outcome: 'failed', reason: 'rpc diagnostic' }))
    assert.deepEqual(h.attrs(), context)
    assert.equal(h.records.at(-1).attrs.diagnostic, true)
    t.mock.timers.tick(60001)
    assert.equal(h.records.at(-1).attrs.step, 'suspected_stall')
    h.controller.dispose()
})

test('identical failures after separate wallet, connection and network attempts survive dedupe and stop timers', t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
    for (const [start, end] of [['wallet_prompt_opened', 'wallet_action_rejected'], ['wallet_connection_started', 'wallet_connection_failed'], ['network_switch_started', 'network_switch_failed']]) {
        const h = harness()
        for (let attempt = 0; attempt < 2; attempt++) {
            h.controller.record(event(start, 'swap-a'))
            h.controller.record(event(end, 'swap-a', { outcome: 'failed', reasonCode: 'same-reason' }))
            h.controller.record(event(end, 'swap-a', { outcome: 'failed', reasonCode: 'same-reason' }))
        }
        assert.equal(h.records.filter(r => r.attrs.step === end).length, 2)
        t.mock.timers.tick(120001)
        assert(!h.records.some(r => r.attrs.step === 'suspected_stall'))
        h.controller.dispose()
    }
})

test('occurrence identity stays event-local and distinguishes same-text failures', () => {
    const h = harness()
    for (const occurrenceId of ['occurrence-a', 'occurrence-b']) {
        h.controller.record(event('wallet_action_failed', 'swap-a', { outcome: 'failed', occurrenceId }))
    }
    assert.deepEqual(h.records.map(r => r.attrs.occurrence_id), ['occurrence-a', 'occurrence-b'])
    assert.equal(h.attrs().occurrence_id, undefined, 'do not stamp the incident on unrelated later records')
    h.controller.dispose()
})
