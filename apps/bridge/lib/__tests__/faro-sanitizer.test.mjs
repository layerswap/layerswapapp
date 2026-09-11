import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { beforeSend, MAX_CONTEXT_VALUE_LENGTH, sanitizeValue } from '../faro-sanitizer.ts'

const require = createRequire(import.meta.url)
const { FaroTraceExporter } = require('@grafana/faro-web-tracing')
const tracingRequire = createRequire(require.resolve('@grafana/faro-web-tracing'))
const { BasicTracerProvider, SimpleSpanProcessor } = tracingRequire('@opentelemetry/sdk-trace-web')
const { resourceFromAttributes } = tracingRequire('@opentelemetry/resources')

const attribute = (key, value) => ({ key, value })
const stringAttribute = (key, value) => attribute(key, { stringValue: value })
const meta = { app: { name: 'layerswap-frontend', version: 'unit-test' }, session: { id: 'test-session' } }
const transportItem = payload => ({ type: 'trace', payload, meta })
const spansOf = payload => payload.resourceSpans.flatMap(r => r.scopeSpans.flatMap(s => s.spans))
const lookup = (container, key) => container.attributes.find(a => a.key === key)?.value

test('nested Error fields use the same redaction and length limits as ordinary strings', () => {
    const error = new Error('Bearer synthetic-secret ' + 'm'.repeat(MAX_CONTEXT_VALUE_LENGTH))
    error.name = 'n'.repeat(MAX_CONTEXT_VALUE_LENGTH + 100)
    error.stack = 'authorization=synthetic-secret ' + 's'.repeat(MAX_CONTEXT_VALUE_LENGTH)
    const output = sanitizeValue({ cause: error }).cause
    for (const field of ['name', 'message', 'stack']) {
        assert.equal(output[field], sanitizeValue(error[field]))
        assert(output[field].endsWith('...[truncated]'))
        assert(output[field].length <= MAX_CONTEXT_VALUE_LENGTH + '...[truncated]'.length)
    }
    assert(!JSON.stringify(output).includes('synthetic-secret'))
})

test('approved ordinary URL queries/fragments and financial investigation fields survive', () => {
    const url = 'https://test.invalid/swap/test-swap?from=ETHEREUM_SEPOLIA&toAsset=ETH&amount=0.01#details'
    const attributes = { page_url: url, 'url.full': url, wallet_address: 'test-wallet',
        swap_id: 'test-swap', transaction_hash: 'test-hash', requested_amount: '0.01' }
    for (const type of ['event', 'log', 'exception', 'measurement']) {
        const input = { type, payload: { attributes }, meta: { page: { url }, session: { id: 'test-session', attributes } } }
        assert.deepEqual(beforeSend(input), input)
    }
    const span = { attributes: Object.entries(attributes).map(([key, value]) => stringAttribute(key, value)), events: [], links: [] }
    const input = transportItem({ resourceSpans: [{ scopeSpans: [{ spans: [span] }] }] })
    assert.deepEqual(beforeSend(input), input)
    assert.equal(sanitizeValue(url + '&api_key=synthetic-secret'), url + '&api_key=[REDACTED]')
})

// Execute the installed Faro exporter and its actual OTLP transformer. This is
// local SDK-generated test data, NOT a browser capture or backend verification.
async function sdkPayload() {
    let payload
    const mirrors = []
    const exporter = new FaroTraceExporter({ api: {
        pushTraces: value => { payload = value },
        pushEvent: (...args) => mirrors.push(args),
    } })
    const provider = new BasicTracerProvider({
        resource: resourceFromAttributes({
            'service.name': 'layerswap-frontend',
            'browser.brands': ['Test browser', 'Test engine'],
            'resource.api_key': 'synthetic-resource-secret',
        }),
        spanProcessors: [new SimpleSpanProcessor(exporter)],
    })
    const span = provider.getTracer('@opentelemetry/instrumentation-fetch', 'test').startSpan('GET', {
        kind: 2,
        attributes: {
            'session.id': 'test-session',
            'http.request.method': 'GET',
            'http.response.status_code': 200,
            'http.request.header.authorization': 'Basic synthetic-header-secret',
            'url.full': 'https://test.invalid/resource?api_key=synthetic-query-secret',
            'wallet_address': 'test-wallet-address',
            'requested_amount': '0.01',
        },
    })
    span.addEvent('wallet test', { 'provider.signature': 'synthetic-event-secret', attempt: 1 })
    span.addLink({ context: { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), traceFlags: 1 },
        attributes: { 'client.secret': 'synthetic-link-secret' } })
    span.setStatus({ code: 2, message: 'authorization=synthetic-status-secret' })
    span.end()
    await provider.forceFlush()
    await provider.shutdown()
    assert(payload)
    return { payload, mirrors }
}

function assertAttributes(attributes) {
    assert(Array.isArray(attributes))
    for (const item of attributes) {
        assert.equal(typeof item.key, 'string')
        assertAnyValue(item.value)
    }
}

function assertAnyValue(value) {
    assert(value && typeof value === 'object' && !Array.isArray(value))
    assert(Object.keys(value).length <= 1)
    if (value.arrayValue) {
        assert(Array.isArray(value.arrayValue.values))
        value.arrayValue.values.forEach(assertAnyValue)
    }
    if (value.kvlistValue) assertAttributes(value.kvlistValue.values)
}

test('real SDK exporter: preserve OTLP wrappers, IDs, timings, flags and attribute types', async () => {
    const { payload, mirrors } = await sdkPayload()
    const original = structuredClone(payload)
    // Reproduce the original failure without modifying the historical fixture.
    assert(spansOf(sanitizeValue(payload))[0].attributes.every(a => a === '[Maximum depth reached]'))
    const sanitized = beforeSend(transportItem(payload)).payload
    assert.deepEqual(payload, original, 'must not mutate data later used by Faro tracing mirrors')
    const originalSpan = spansOf(payload)[0]
    const span = spansOf(sanitized)[0]
    for (const field of ['traceId', 'spanId', 'parentSpanId', 'startTimeUnixNano', 'endTimeUnixNano', 'kind', 'flags', 'droppedAttributesCount']) {
        assert.deepEqual(span[field], originalSpan[field], field)
    }
    assert.equal(span.attributes.length, originalSpan.attributes.length)
    assertAttributes(span.attributes)
    assertAttributes(span.events[0].attributes)
    assertAttributes(span.links[0].attributes)
    assert.deepEqual(lookup(sanitized.resourceSpans[0].resource, 'browser.brands'), {
        arrayValue: { values: [{ stringValue: 'Test browser' }, { stringValue: 'Test engine' }] },
    })
    assert.deepEqual(lookup(span, 'session.id'), { stringValue: 'test-session' })
    assert.deepEqual(lookup(span, 'http.response.status_code'), { intValue: 200 })
    assert.equal(mirrors[0][3].spanContext.traceId, span.traceId)
    assert.equal(mirrors[0][3].spanContext.spanId, span.spanId)
    // The agreed wallet/amount policy is not changed by a technical structure fix.
    assert.deepEqual(lookup(span, 'wallet_address'), { stringValue: 'test-wallet-address' })
    assert.deepEqual(lookup(span, 'requested_amount'), { stringValue: '0.01' })
})

test('semantic keys redact resource, scope, span, span-event and link values', async () => {
    const { payload } = await sdkPayload()
    payload.resourceSpans[0].scopeSpans[0].scope.attributes = [stringAttribute('scope.cookie', 'synthetic-scope-secret')]
    const sanitized = beforeSend(transportItem(payload)).payload
    const span = spansOf(sanitized)[0]
    for (const [container, key] of [
        [sanitized.resourceSpans[0].resource, 'resource.api_key'],
        [sanitized.resourceSpans[0].scopeSpans[0].scope, 'scope.cookie'],
        [span, 'http.request.header.authorization'],
        [span.events[0], 'provider.signature'],
        [span.links[0], 'client.secret'],
    ]) assert.deepEqual(lookup(container, key), { stringValue: '[REDACTED]' })
    const serialized = JSON.stringify(sanitized)
    assert(!serialized.includes('synthetic-'))
    assert(serialized.includes('https://test.invalid/resource?api_key=[REDACTED]'))
    assert.equal(span.status.code, 2)
})

test('nested AnyValues retain valid containers, scalar values and bounded strings', async () => {
    const { payload } = await sdkPayload()
    const span = spansOf(payload)[0]
    const shared = { stringValue: 'shared safe value' }
    span.attributes = [
        attribute('nested', { kvlistValue: { values: [
            attribute('provider.private_key', { arrayValue: { values: [{ stringValue: 'synthetic-nested-secret' }] } }),
            attribute('safe', { arrayValue: { values: [shared, shared, { boolValue: false }, { intValue: 0 }, { doubleValue: 1.25 }] } }),
        ] } }),
        stringAttribute('long', 'x'.repeat(MAX_CONTEXT_VALUE_LENGTH + 10)),
        attribute('bytes', { bytesValue: 'AQID' }),
    ]
    const sanitized = spansOf(beforeSend(transportItem(payload)).payload)[0]
    assertAttributes(sanitized.attributes)
    const nested = lookup(sanitized, 'nested').kvlistValue.values
    assert.deepEqual(nested[0].value, { stringValue: '[REDACTED]' })
    assert.deepEqual(nested[1].value.arrayValue.values, [shared, shared, { boolValue: false }, { intValue: 0 }, { doubleValue: 1.25 }])
    assert.equal(lookup(sanitized, 'long').stringValue, 'x'.repeat(MAX_CONTEXT_VALUE_LENGTH) + '...[truncated]')
    assert.deepEqual(lookup(sanitized, 'bytes'), { bytesValue: 'AQID' })
})

test('batched resources/scopes/spans and optional envelopes survive sanitization', async () => {
    const { payload } = await sdkPayload()
    payload.resourceSpans[0].scopeSpans.push(structuredClone(payload.resourceSpans[0].scopeSpans[0]))
    payload.resourceSpans.push(structuredClone(payload.resourceSpans[0]))
    const item = transportItem(payload)
    item.meta = { ...meta, session: { ...meta.session, attributes: { password: 'synthetic-meta-secret' } } }
    const output = beforeSend(item)
    assert.equal(output.payload.resourceSpans.length, 2)
    assert.equal(spansOf(output.payload).length, 4)
    assert(spansOf(output.payload).every(span => lookup(span, 'session.id').stringValue === 'test-session'))
    assert.equal(output.meta.session.attributes.password, '[REDACTED]')
    assert.deepEqual(beforeSend(transportItem({})).payload, {})
    assert.deepEqual(beforeSend(transportItem({ resourceSpans: [{ scopeSpans: [{}] }] })).payload,
        { resourceSpans: [{ scopeSpans: [{}] }] })
})

test('cycles/depth limits use typed markers within AnyValues, never in structural arrays', async () => {
    const { payload } = await sdkPayload()
    const cycle = { arrayValue: { values: [] } }
    cycle.arrayValue.values.push(cycle)
    let deep = { stringValue: 'deep value' }
    for (let i = 0; i < 20; i++) deep = { arrayValue: { values: [deep] } }
    spansOf(payload)[0].attributes = [attribute('cycle', cycle), attribute('deep', deep)]
    const sanitized = beforeSend(transportItem(payload)).payload
    const span = spansOf(sanitized)[0]
    assertAttributes(span.attributes)
    assert(JSON.stringify(span).includes('"stringValue":"[Circular]"'))
    assert(JSON.stringify(span).includes('"stringValue":"[Maximum depth reached]"'))
    assert.equal(span.traceId, spansOf(payload)[0].traceId)
})

test('non-trace redaction, metadata filtering and ResizeObserver suppression remain active', () => {
    for (const type of ['event', 'log', 'measurement', 'exception']) {
        const input = { type, payload: { value: 'Bearer synthetic-bearer', attributes: { authorization: 'synthetic-plain-secret', safe: 'ok' } },
            meta: { ...meta, session: { ...meta.session, attributes: { api_key: 'synthetic-meta-secret' } } } }
        const original = structuredClone(input)
        const output = beforeSend(input)
        assert.equal(output.payload.value, 'Bearer [REDACTED]')
        assert.equal(output.payload.attributes.authorization, '[REDACTED]')
        assert.equal(output.payload.attributes.safe, 'ok')
        assert.equal(output.meta.session.attributes.api_key, '[REDACTED]')
        assert.equal(output.meta.session.id, 'test-session')
        assert.deepEqual(input, original)
    }
    assert.equal(beforeSend({ type: 'exception', payload: { value: 'ResizeObserver loop limit exceeded' }, meta }), null)
    assert(beforeSend({ type: 'log', payload: { value: 'ResizeObserver loop limit exceeded' }, meta }))
    const cyclic = { safe: 'ok' }; cyclic.self = cyclic
    assert.equal(sanitizeValue(cyclic).self, '[Circular]')
})

test('historic damaged browser fixtures remain unchanged and cannot be recovered by the new hook', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../grafana/fixtures/faro-controlled-browser-payload.json', import.meta.url)))
    const traces = fixture.requests.map(r => r.body.traces).filter(Boolean)
    assert.equal(traces.length, 2)
    for (const payload of traces) {
        const original = structuredClone(payload)
        assert.equal(beforeSend(transportItem(payload)), null)
        assert.deepEqual(payload, original)
    }
})

test('fresh browser excerpts retain typed span attributes, resource brands and observed Loki mirror correlation', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../grafana/fixtures/faro-sanitizer-browser-span-excerpt.json', import.meta.url)))
    const span = fixture.spanExcerpt
    assert.equal(span.attributes.length, 6)
    assertAttributes(span.attributes)
    // Only the excerpts are browser evidence. Their enclosing association,
    // wrapper and empty event/link arrays are test-only, not captured fields.
    const testSpan = { ...span, events: [], links: [] }
    const brands = fixture.resourceAttributeExcerpt
    assertAttributes([brands])
    assert.deepEqual(brands.value.arrayValue.values, [
        { stringValue: 'Chromium' }, { stringValue: 'Not?A_Brand' }, { stringValue: 'Google Chrome' },
    ])
    const payload = { resourceSpans: [{ resource: { attributes: [brands] }, scopeSpans: [{ spans: [testSpan] }] }] }
    const original = structuredClone(payload)
    const output = beforeSend(transportItem(payload)).payload
    assert.deepEqual(spansOf(output)[0], testSpan)
    assert.deepEqual(output.resourceSpans[0].resource.attributes, [brands])
    assert.deepEqual(payload, original)
    const stored = fixture.lokiVerification.record.parsedFields
    assert.equal(span.traceId, stored.traceID)
    assert.equal(span.spanId, stored.spanID)
    assert.equal(lookup(span, 'session.id').stringValue, stored.session_id)
    assert.equal(stored.session_id, stored.event_data_session_id)
    for (const [key, field, variant] of [
        ['http.request.method', 'event_data_http_request_method', 'stringValue'],
        ['url.full', 'event_data_url_full', 'stringValue'],
        ['http.response.status_code', 'event_data_http_response_status_code', 'intValue'],
        ['server.address', 'event_data_server_address', 'stringValue'],
        ['server.port', 'event_data_server_port', 'intValue'],
    ]) assert.equal(String(lookup(span, key)[variant]), stored[field])
    assert.equal(new URL(lookup(span, 'url.full').stringValue).search, '')
    assert.match(span.traceId, /^[0-9a-f]{32}$/)
    assert.match(span.spanId, /^[0-9a-f]{16}$/)
})

test('malformed trace attributes are dropped instead of leaking uninspected values', async () => {
    const { payload } = await sdkPayload()
    spansOf(payload)[0].attributes = [attribute('unknown', { unrecognizedValue: 'synthetic-secret' })]
    assert.equal(beforeSend(transportItem(payload)), null)
    for (const variant of ['stringValue', 'boolValue', 'intValue', 'doubleValue', 'bytesValue']) {
        spansOf(payload)[0].attributes = [attribute('unknown', { [variant]: { authorization: 'synthetic-secret' } })]
        assert.equal(beforeSend(transportItem(payload)), null)
    }
})
