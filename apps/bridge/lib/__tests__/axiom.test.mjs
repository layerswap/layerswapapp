import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('../../pages/api/axiom.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
function harness(fetch, env = {}) {
    const exports = {}
    vm.runInNewContext(compiled, { exports, require: createRequire(import.meta.url), URL, AbortSignal, console: { error() {} },
        process: { env: { NEXT_PUBLIC_TELEMETRY_PROVIDER: 'axiom', AXIOM_TOKEN: 'secret', AXIOM_DATASET: 'frontend', ...env } }, fetch })
    return async (body, overrides = {}) => {
        const res = { setHeader() {}, status(code) { this.statusCode = code; return this }, end() {}, json(body) { this.body = body } }
        await exports.default({ method: 'POST', headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'content-type': 'application/json' }, body, ...overrides }, res)
        return res
    }
}
const batch = { meta: { session: { id: 'session-1', attributes: { journey_id: 'old', swap_id: 'swap-1' } } }, events: [
    { name: 'swap_lifecycle', timestamp: '2026-10-26T12:00:00Z', attributes: { journey_id: 'journey-1', step: 'swap_completed' } },
] }
test('forwards correlated events to Axiom using server credentials and original timestamps', async () => {
    const post = harness(async (url, options) => {
        assert.equal(url, 'https://us-east-1.aws.edge.axiom.co/v1/ingest/frontend')
        assert.equal(options.headers.Authorization, 'Bearer secret')
        const [event] = JSON.parse(options.body)
        assert.equal(event.journey_id, 'journey-1')
        assert.equal(event.swap_id, 'swap-1')
        assert.equal(event.step, 'swap_completed')
        assert.equal(event._time, batch.events[0].timestamp)
        assert.equal(event.session_id, 'session-1')
        assert.deepEqual(JSON.parse(event.payload_json), batch.events[0])
        return Response.json({ ingested: 1, failed: 0 })
    })
    assert.equal((await post(batch)).statusCode, 204)
})
test('rejects disabled, unconfigured, cross-site, malformed and oversized batches before forwarding', async () => {
    const unexpected = () => assert.fail('must not forward')
    assert.equal((await harness(unexpected, { NEXT_PUBLIC_TELEMETRY_PROVIDER: '' })(batch)).statusCode, 404)
    assert.equal((await harness(unexpected, { AXIOM_TOKEN: '' })(batch)).statusCode, 503)
    const post = harness(unexpected)
    assert.equal((await post(batch, { headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403)
    assert.equal((await post({ meta: {}, events: [null] })).statusCode, 400)
    assert.equal((await post({ meta: {}, events: Array(1001).fill({}) })).statusCode, 413)
})
test('reports upstream errors and partial ingestion without exposing upstream responses', async () => {
    for (const response of [Response.json({ failed: 1, ingested: 0 }), new Response('secret details', { status: 500 })]) {
        const res = await harness(async () => response)(batch)
        assert.equal(res.statusCode, 502)
        assert(!JSON.stringify(res).includes('secret'))
    }
    assert.equal((await harness(async () => { throw new Error('network') })(batch)).statusCode, 502)
})


test('ambient blocked state cannot label unrelated operations as blocked', async () => {
    const post = harness(async (_url, options) => {
        const [event] = JSON.parse(options.body)
        assert.equal(event.journey_id, 'journey-1')
        assert.equal(event.outcome, undefined)
        assert.equal(event.step, undefined)
        assert.equal(JSON.parse(event.meta_json).session.attributes.outcome, 'blocked')
        return Response.json({ ingested: 1, failed: 0 })
    })
    assert.equal((await post({
        meta: { session: { attributes: { journey_id: 'journey-1', outcome: 'blocked', step: 'transfer_blocked' } } },
        events: [{ name: 'faro.performance.resource', attributes: { duration: 12 } }],
    })).statusCode, 204)
})


test('dynamic nested attributes cannot expand the Axiom column schema', async () => {
    const nested = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`field_${i}`, { value: i }]))
    const post = harness(async (_url, options) => {
        const [event] = JSON.parse(options.body)
        assert.equal(event.step, 'transfer_blocked')
        assert.equal(event.reason_code, 'insufficient_balance')
        assert.equal(typeof event.payload_json, 'string')
        assert.equal(typeof event.meta_json, 'string')
        assert(!Object.values(event).some(value => value !== null && typeof value === 'object'))
        assert.deepEqual(JSON.parse(event.payload_json).attributes.nested, nested)
        assert(Object.keys(event).length < 50)
        return Response.json({ ingested: 1, failed: 0 })
    })
    assert.equal((await post({ meta: { nested }, events: [{
        name: 'swap_lifecycle', attributes: { step: 'transfer_blocked', reason_code: 'insufficient_balance', nested },
    }] })).statusCode, 204)
})


for (const [label, value] of [
    ['nested object', { unexpected: { column: 'value' } }],
    ['array', [{ unexpected: 'column' }]],
    ['number', 42],
    ['boolean', true],
    ['oversized string', 'x'.repeat(257)],
]) {
    test(`promoted identifiers omit a ${label} while preserving diagnostic data`, async () => {
        const post = harness(async (_url, options) => {
            const [event] = JSON.parse(options.body)
            for (const field of ['journey_id', 'swap_id', 'name', 'session_id']) {
                assert.equal(Object.hasOwn(event, field), false, field)
            }
            assert(!Object.values(event).some(item => item !== null && typeof item === 'object'))
            assert.deepEqual(JSON.parse(event.payload_json).name, value)
            assert.deepEqual(JSON.parse(event.meta_json).session.id, value)
            return Response.json({ ingested: 1, failed: 0 })
        })
        assert.equal((await post({
            meta: { session: { id: value, attributes: { journey_id: value, swap_id: value } } },
            events: [{ name: value, attributes: { journey_id: value, swap_id: value } }],
        })).statusCode, 204)
        // The session fallback must be checked as well as explicit event fields.
        assert.equal((await post({
            meta: { session: { id: value, attributes: { journey_id: value, swap_id: value } } },
            events: [{ name: value, attributes: {} }],
        })).statusCode, 204)
    })
}

test('promoted identifiers preserve bounded strings and explicit empty swap IDs', async () => {
    const limit = 'x'.repeat(256)
    const post = harness(async (_url, options) => {
        const [event] = JSON.parse(options.body)
        assert.equal(event.journey_id, limit)
        assert.equal(event.swap_id, '')
        assert.equal(event.name, limit)
        assert.equal(event.session_id, limit)
        return Response.json({ ingested: 1, failed: 0 })
    })
    assert.equal((await post({
        meta: { session: { id: limit, attributes: { journey_id: limit, swap_id: 'previous-swap' } } },
        events: [{ name: limit, attributes: { swap_id: '' } }],
    })).statusCode, 204)
})
