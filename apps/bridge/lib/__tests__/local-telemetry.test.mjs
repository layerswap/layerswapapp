import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { FetchTransport, TransportItemType } from '@grafana/faro-web-sdk'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('../../pages/api/local-telemetry.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

async function harness(t, nodeEnv = 'development') {
    const directory = await mkdtemp(join(tmpdir(), 'layerswap-telemetry-'))
    t.after(() => rm(directory, { recursive: true, force: true }))
    const exports = {}
    vm.runInNewContext(compiled, { exports, require, URL, process: { env: { NODE_ENV: nodeEnv }, cwd: () => directory }, console: { error() {} } })
    const post = async (body, overrides = {}) => {
        // Node's response methods return the response object; the handler must not.
        const res = { headers: {}, setHeader(key, value) { this.headers[key] = value }, status(code) { this.statusCode = code; return this }, end() { return this }, json(value) { this.body = value; return this } }
        const result = await exports.default({ method: 'POST', headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'content-type': 'application/json' }, body, ...overrides }, res)
        assert.equal(result, undefined, 'Pages API handlers must not return the response object')
        return res
    }
    return { directory, post, read: async () => (await readFile(join(directory, '.next/local-logs/browser.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse) }
}

test('installed Faro transport writes every signal with its metadata and appends concurrent batches', async t => {
    const h = await harness(t)
    const meta = { session: { id: 'local-session', attributes: { swap_id: 'swap-1' } } }
    const transport = new FetchTransport({ url: 'http://localhost:3000/api/local-telemetry' })
    transport.metas = { value: meta }
    transport.config = {}
    transport.internalLogger = { error: assert.fail, warn: assert.fail, debug() {} }
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url, 'http://localhost:3000/api/local-telemetry')
        const res = await h.post(JSON.parse(options.body))
        assert.equal(res.statusCode, 204)
        return new Response(null, { status: res.statusCode })
    })
    assert(transport.getIgnoreUrls().includes('http://localhost:3000/api/local-telemetry'), 'collector requests must not produce recursive telemetry')
    await transport.send([
        { type: TransportItemType.LOG, payload: { message: 'hello\nworld', level: 'info' }, meta },
        { type: TransportItemType.EVENT, payload: { name: 'widget_operation' }, meta },
        { type: TransportItemType.EXCEPTION, payload: { value: 'failed' }, meta },
        { type: TransportItemType.MEASUREMENT, payload: { type: 'web-vitals', values: { lcp: 100 } }, meta },
        { type: TransportItemType.TRACE, payload: { resourceSpans: [{ resource: {}, scopeSpans: [] }] }, meta },
    ])
    await Promise.all(Array.from({ length: 5 }, (_, i) => h.post({ meta, events: [{ name: `extra-${i}` }] })))
    const records = await h.read()
    assert.equal(records.length, 10)
    assert.deepEqual(records.slice(0, 5).map(record => record.type), ['log', 'event', 'exception', 'measurement', 'trace'])
    assert.equal(records[0].payload.message, 'hello\nworld')
    for (const record of records) {
        assert.deepEqual(record.meta, meta)
        assert(Number.isFinite(Date.parse(record.receivedAt)))
    }
})

test('collector rejects production access, other sites, non-JSON and malformed batches without writing', async t => {
    for (const env of ['production', 'test']) {
        const h = await harness(t, env)
        assert.equal((await h.post({ meta: {}, logs: [{}] })).statusCode, 404)
        await assert.rejects(h.read(), { code: 'ENOENT' })
    }
    const h = await harness(t)
    assert.equal((await h.post({}, { method: 'GET' })).statusCode, 405)
    assert.equal((await h.post({}, { headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403)
    assert.equal((await h.post({}, { headers: { origin: 'https://other.test', host: 'localhost:3000' } })).statusCode, 403)
    assert.equal((await h.post({}, { headers: { 'content-type': 'text/plain' } })).statusCode, 415)
    for (const body of [null, [], {}, { meta: {} }, { meta: {}, logs: [null] }, { meta: {}, events: 'bad' }, { meta: {}, traces: [] }]) {
        assert.equal((await h.post(body)).statusCode, 400)
    }
    await assert.rejects(h.read(), { code: 'ENOENT' })
})

test('a failed disk write is reported and does not poison subsequent writes', async t => {
    const h = await harness(t)
    await mkdir(join(h.directory, '.next'))
    const blocker = join(h.directory, '.next/local-logs')
    await writeFile(blocker, 'not a directory')
    assert.equal((await h.post({ meta: {}, logs: [{ message: 'first' }] })).statusCode, 500)
    await rm(blocker)
    assert.equal((await h.post({ meta: {}, logs: [{ message: 'second' }] })).statusCode, 204)
    assert.equal((await h.read())[0].payload.message, 'second')
})

test('collector limits the total records across signal types, including traces', async t => {
    const h = await harness(t)
    for (const body of [
        { meta: {}, events: Array.from({ length: 1001 }, () => ({})) },
        { meta: {}, logs: Array.from({ length: 600 }, () => ({})), events: Array.from({ length: 401 }, () => ({})) },
        { meta: {}, logs: Array.from({ length: 1000 }, () => ({})), traces: {} },
    ]) {
        assert.equal((await h.post(body)).statusCode, 413)
        await assert.rejects(h.read(), { code: 'ENOENT' })
    }
    assert.equal((await h.post({ meta: {}, events: Array.from({ length: 1000 }, () => ({})) })).statusCode, 204)
    assert.equal((await h.read()).length, 1000)
})

for (const [label, body] of [
    ['repeated metadata', { meta: { padding: 'x'.repeat(8192) }, events: Array.from({ length: 800 }, () => ({})) }],
    ['UTF-8 metadata shared by logs and traces', { meta: { padding: '🙂'.repeat(700000) }, logs: [{}], traces: {} }],
]) {
    test(`collector rejects excessive serialized output from ${label} without partial writes`, async t => {
        const h = await harness(t)
        assert(Buffer.byteLength(JSON.stringify(body)) < 5 * 1024 * 1024, 'input fits the request body limit')
        assert.equal((await h.post(body)).statusCode, 413)
        await assert.rejects(h.read(), { code: 'ENOENT' })
        assert.equal((await h.post({ meta: {}, events: [{ name: 'next-batch' }] })).statusCode, 204)
        assert.equal((await h.read())[0].payload.name, 'next-batch')
    })
}
