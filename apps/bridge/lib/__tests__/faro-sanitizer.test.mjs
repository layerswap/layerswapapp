import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { beforeSend, flattenContext, MAX_CONTEXT_VALUE_LENGTH, MAX_NODES, sanitizeValue, serializeConsoleArgs } from '../faro-sanitizer.ts'

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
    error.stack = 'authorization=synthetic-secret\n' + 's'.repeat(MAX_CONTEXT_VALUE_LENGTH)
    const output = sanitizeValue({ cause: error }).cause
    for (const field of ['name', 'message', 'stack']) {
        assert.equal(output[field], sanitizeValue(error[field]))
        assert(output[field].endsWith('...[truncated]'))
        assert(output[field].length <= MAX_CONTEXT_VALUE_LENGTH + '...[truncated]'.length)
    }
    assert(!JSON.stringify(output).includes('synthetic-secret'))
})

test('serialized console arguments keep no cookie, basic credential or multi-word secret', () => {
    const headers = { cookie: 'session=synthetic-cookie; theme=dark', Authorization: 'Basic synthetic-basic', mnemonic: 'alpha beta gamma delta' }
    assert.equal(sanitizeValue(JSON.stringify(headers)),
        JSON.stringify({ cookie: '[REDACTED]', Authorization: '[REDACTED]', mnemonic: '[REDACTED]' }))
    assert.equal(sanitizeValue('Authorization: Basic synthetic-basic\nnext: ok'), 'Authorization: [REDACTED]\nnext: ok')
    assert.equal(sanitizeValue('mnemonic=alpha beta gamma, safe=ok'), 'mnemonic=[REDACTED], safe=ok')
    assert.equal(sanitizeValue("{ password: 'with \\' quote', safe: 1 }"), "{ password: '[REDACTED]', safe: 1 }")
    assert.equal(sanitizeValue('{"mnemonic":["alpha","beta"],"safe":["ok"]}'), '{"mnemonic":[REDACTED],"safe":["ok"]}')
    assert.equal(sanitizeValue(sanitizeValue('api_key=synthetic]')), 'api_key=[REDACTED]')
    // Faro joins console.error arguments into one string before beforeSend runs.
    assert.equal(serializeConsoleArgs(['request failed', { headers, nested: { seed_phrase: 'alpha beta' } }, 42, null]),
        'request failed {"headers":{"cookie":"[REDACTED]","Authorization":"[REDACTED]","mnemonic":"[REDACTED]"},"nested":{"seed_phrase":"[REDACTED]"}} 42 null')
    assert(!/synthetic|alpha|beta/.test(serializeConsoleArgs(['Bearer synthetic-bearer', headers])))
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

test('WalletConnect relay auth and other credential query params are redacted inside console arguments', () => {
    const relay = 'wss://relay.walletconnect.org/?auth=eyJhbGciOiJFZERTQSJ9.synthetic-jwt&projectId=test-project&ua=wc-2'
    const serialized = serializeConsoleArgs(['WebSocket connection failed:', relay, { url: relay }])
    assert(!serialized.includes('synthetic-jwt'))
    assert(serialized.includes('projectId=test-project&ua=wc-2'))
    assert.equal(sanitizeValue(relay), 'wss://relay.walletconnect.org/?auth=[REDACTED]&projectId=test-project&ua=wc-2')
    for (const param of ['token', 'key', 'sig', 'secret', 'jwt', 'session_token', 'credential']) {
        assert.equal(sanitizeValue(`https://test.invalid/p?from=ETH&${param}=synthetic-secret&safe=ok`),
            `https://test.invalid/p?from=ETH&${param}=[REDACTED]&safe=ok`)
    }
    assert.equal(sanitizeValue('{"jwt":"synthetic-secret","safe":1}'), '{"jwt":"[REDACTED]","safe":1}')
})

test('credential-like nested keys are redacted by whole segment, ordinary lookalikes survive', () => {
    const redacted = {
        auth: 's', authToken: 's', 'x-auth-token': 's', clientSecret: 's', secret: 's', jwt: 's', idJwt: 's',
        sessionToken: 's', session_key: 's', credentials: { user: 's' }, password: 's', signature: 's', txSignature: 's',
    }
    const kept = {
        signatureRequired: true, author: 'Ada', isAuthenticated: true, oauthProvider: 'test',
        sessionId: 'test-session', session_id: 'test-session', session: { id: 'test-session' }, previousSession: 'prev',
    }
    const output = sanitizeValue({ outer: { inner: { ...redacted, ...kept } } }).outer.inner
    assert.deepEqual(output, { ...Object.fromEntries(Object.keys(redacted).map(key => [key, '[REDACTED]'])), ...kept })
})

test('OAuth callback query and fragment credentials are redacted in metadata and OTLP URLs', () => {
    for (const separator of ['?', '#']) {
        const url = `https://test.invalid/app/imtblRedirect${separator}code=synthetic-code&state=synthetic-state&code_verifier=synthetic-verifier&from=ETH&error_code=4001#details`
        const expected = `https://test.invalid/app/imtblRedirect${separator}code=[REDACTED]&state=[REDACTED]&code_verifier=[REDACTED]&from=ETH&error_code=4001#details`
        for (const type of ['event', 'log', 'exception', 'measurement']) {
            const input = { type, payload: { url, reason_code: 'user_rejected', error_code: '4001' }, meta: { page: { url } } }
            const output = beforeSend(input)
            assert.equal(output.meta.page.url, expected)
            assert.deepEqual(output.payload, { url: expected, reason_code: 'user_rejected', error_code: '4001' })
            assert.equal(input.meta.page.url, url)
        }
        const span = { attributes: [stringAttribute('url.full', url), stringAttribute('http.url', url)], events: [], links: [] }
        const output = beforeSend({ ...transportItem({ resourceSpans: [{ scopeSpans: [{ spans: [span] }] }] }), meta: { page: { url } } })
        assert.equal(output.meta.page.url, expected)
        for (const key of ['url.full', 'http.url']) assert.deepEqual(lookup(spansOf(output.payload)[0], key), { stringValue: expected })
        assert(!JSON.stringify(output).includes('synthetic-'))
    }
    for (const key of ['CODE', 'State', 'code-verifier', 'codeVerifier']) {
        assert.equal(sanitizeValue(`https://test.invalid/#${key}=synthetic-secret&safe=ok`),
            `https://test.invalid/#${key}=[REDACTED]&safe=ok`)
    }
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
    // Reproduce the original failure: the generic sanitizer destroyed OTLP attributes.
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

test('malformed trace attributes are dropped instead of leaking uninspected values', async () => {
    const { payload } = await sdkPayload()
    spansOf(payload)[0].attributes = [attribute('unknown', { unrecognizedValue: 'synthetic-secret' })]
    assert.equal(beforeSend(transportItem(payload)), null)
    for (const variant of ['stringValue', 'boolValue', 'intValue', 'doubleValue', 'bytesValue']) {
        spansOf(payload)[0].attributes = [attribute('unknown', { [variant]: { authorization: 'synthetic-secret' } })]
        assert.equal(beforeSend(transportItem(payload)), null)
    }
})

const MAX_DEPTH = 8 // mirrors the module-private constant in faro-sanitizer.ts
const token = { symbol: 'ETH', decimals: 18 }
const countValues = value => {
    if (value === null || typeof value !== 'object') return 1
    return 1 + Object.values(value).reduce((sum, child) => sum + countValues(child), 0)
}
const dag = (fanout, height) => {
    let node = { leaf: 1 }
    for (let level = 0; level < height; level++) {
        const parent = {}
        for (let i = 0; i < fanout; i++) parent['k' + i] = node
        node = parent
    }
    return node
}

test('shared non-cyclic references serialize as copies, never as [Circular]', () => {
    const outputs = [
        [sanitizeValue({ source: token, destination: token }), { source: token, destination: token }],
        [sanitizeValue([token, token]), [token, token]],
        [sanitizeValue({ swap: { source: token, destination: token } }), { swap: { source: token, destination: token } }],
    ]
    for (const [output, expected] of outputs) {
        assert.deepEqual(output, expected)
        assert(!JSON.stringify(output).includes('[Circular]'))
    }
    const error = new Error('boom')
    const errorOutput = sanitizeValue({ cause: error, context: error })
    assert.equal(typeof errorOutput.context, 'object')
    assert.deepEqual(errorOutput.context, errorOutput.cause)
    assert(!JSON.stringify(errorOutput).includes('[Circular]'))
    const consoleOutput = serializeConsoleArgs([{ a: token, b: token }])
    assert.equal(consoleOutput, JSON.stringify({ a: token, b: token }))
    const logOutput = beforeSend({ type: 'log', payload: { context: { a: token, b: token } }, meta })
    assert.deepEqual(logOutput.payload.context, { a: token, b: token })
    assert(!JSON.stringify(logOutput).includes('[Circular]'))
})

test('true cycles are still marked and ancestors are released on the cycle-return path', () => {
    const cyclic = { safe: 'ok' }
    cyclic.self = cyclic
    const output = sanitizeValue({ x: cyclic, y: cyclic })
    assert.equal(output.x.self, '[Circular]')
    assert.equal(output.y.safe, 'ok')
    assert.equal(output.y.self, '[Circular]')
    const a = {}
    const b = { a }
    a.b = b
    assert.deepEqual(sanitizeValue(a), { b: { a: '[Circular]' } })
})

test('reference identity is unobservable and inputs are not mutated', () => {
    for (const input of [{ swap: { source: token, destination: token } }, dag(3, 4)]) {
        const before = structuredClone(input)
        assert.deepEqual(sanitizeValue(input), sanitizeValue(structuredClone(input)))
        assert.deepEqual(input, before)
    }
})

test('node budget bounds width on the raw-value path', () => {
    for (const input of [dag(8, 12), Array(200_000).fill(token), Object.fromEntries(Array.from({ length: 50_000 }, (_, i) => ['k' + i, i]))]) {
        const output = sanitizeValue(input)
        assert(countValues(output) <= MAX_NODES + MAX_DEPTH + 1)
        const serialized = JSON.stringify(output)
        assert(serialized.includes('[Maximum size reached]'))
        assert(!serialized.includes('[Circular]'))
    }
})

test('node budget bounds width on the OTLP path', async () => {
    const { payload } = await sdkPayload()
    let shared = { stringValue: 'leaf' }
    for (let level = 0; level < 12; level++) shared = { arrayValue: { values: Array(12).fill(shared) } }
    const wide = { arrayValue: { values: Array(200_000).fill({ stringValue: 'x' }) } }
    spansOf(payload)[0].attributes = [attribute('dag', shared), attribute('wide', wide)]
    const sanitized = beforeSend(transportItem(payload))
    assert(sanitized)
    const span = spansOf(sanitized.payload)[0]
    assertAttributes(span.attributes)
    const serialized = JSON.stringify(span)
    assert(serialized.length < 400_000)
    assert(serialized.includes('"stringValue":"[Maximum size reached]"'))
    assert(!serialized.includes('[Circular]'))
})

test('flattenContext keeps shared references, marks cycles, redacts and truncates leaves', () => {
    assert.deepEqual(flattenContext({ swap: { source: token, destination: token } }), {
        'swap.source.symbol': 'ETH',
        'swap.source.decimals': '18',
        'swap.destination.symbol': 'ETH',
        'swap.destination.decimals': '18',
    })
    const c = { safe: 'ok' }
    c.self = c
    const cyclic = flattenContext({ c })
    assert.equal(cyclic['c.safe'], 'ok')
    assert.equal(cyclic['c.self'], '[Circular]')
    assert.equal(flattenContext({ nested: { api_key: 'x' } })['nested.api_key'], '[REDACTED]')
    const long = flattenContext({ long: 'y'.repeat(MAX_CONTEXT_VALUE_LENGTH + 10) })
    assert(long.long.endsWith('...[truncated]'))
})

test('non-OTLP depth limit still applies through sanitizeValue', () => {
    let deep = { leaf: 'value' }
    for (let i = 0; i < 20; i++) deep = { nested: deep }
    assert(JSON.stringify(sanitizeValue(deep)).includes('[Maximum depth reached]'))
})
