import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        try { return nextResolve(`${specifier}.js`, context) }
        catch (error) {
            if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
            return nextResolve(`${specifier}/index.js`, context)
        }
    }
    return nextResolve(specifier, context)
} })
after(() => hooks.deregister())

const { resolveFallbackTransport, resolveTransports } = await import('../dist/esm/evmUtils/resolveTransports.js')
const request = { method: 'eth_getBlockByNumber', params: ['latest', false] }
const nodes = ['https://primary.invalid', 'https://secondary.invalid']

function mockRpc(t, response) {
    const attempts = []
    const delays = []
    t.mock.method(globalThis, 'fetch', async (url, init) => {
        attempts.push(String(url))
        return response(String(url), JSON.parse(init.body))
    })
    const setTimeoutOriginal = globalThis.setTimeout
    t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => {
        // Skip real backoff time, but assert the production delay below.
        if (delay < 60000) delays.push(delay)
        return setTimeoutOriginal(callback, delay < 60000 ? 0 : delay, ...args)
    })
    return { attempts, delays }
}

const rateLimited = () => new Response('Too many requests', { status: 429 })

for (const [retryCount, attemptsExpected] of [[undefined, 4], [0, 1], [1, 2]]) {
    test(`HTTP 429 honors retryCount=${retryCount ?? 'default'} without multiplying retries`, async t => {
        const { attempts, delays } = mockRpc(t, rateLimited)
        const transport = resolveFallbackTransport([nodes[0]], { retryCount })({})
        await assert.rejects(transport.request(request))
        assert.equal(attempts.length, attemptsExpected)
        assert.deepEqual(delays, [150, 300, 600].slice(0, attemptsExpected - 1))
    })
}

test('a rate-limited primary immediately falls back to a healthy secondary', async t => {
    const { attempts, delays } = mockRpc(t, (url, body) => url === nodes[0]
        ? rateLimited()
        : Response.json({ jsonrpc: '2.0', id: body.id, result: { number: '0x1' } }))
    const transport = resolveFallbackTransport(nodes)({})
    assert.deepEqual(await transport.request(request), { number: '0x1' })
    assert.deepEqual(attempts, nodes)
    assert.deepEqual(delays, [])
})

test('each retry visits both endpoints once', async t => {
    const { attempts } = mockRpc(t, rateLimited)
    await assert.rejects(resolveFallbackTransport(nodes)({}).request(request))
    assert.deepEqual(attempts, [...nodes, ...nodes, ...nodes, ...nodes])
})

test('fallback retries honor the endpoint Retry-After header', async t => {
    const { attempts, delays } = mockRpc(t, () => new Response('Too many requests', {
        status: 429, headers: { 'Retry-After': '8' },
    }))
    await assert.rejects(resolveFallbackTransport([nodes[0]], { retryCount: 1 })({}).request(request))
    assert.equal(attempts.length, 2)
    assert.deepEqual(delays, [8000])
})

test('standalone HTTP transports retain their retry budget', async t => {
    const { attempts } = mockRpc(t, rateLimited)
    await assert.rejects(resolveTransports([nodes[0]])[0]({}).request(request))
    assert.equal(attempts.length, 4)
})
