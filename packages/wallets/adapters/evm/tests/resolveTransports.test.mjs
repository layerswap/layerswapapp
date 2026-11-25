import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        const isExtensionlessDistImport = specifier.startsWith('.')
            && !extname(specifier)
            && context.parentURL?.includes('/dist/esm/')
        if (!isExtensionlessDistImport) {
            return nextResolve(specifier, context)
        }

        try {
            return nextResolve(`${specifier}.js`, context)
        } catch (error) {
            if (error.code !== 'ERR_MODULE_NOT_FOUND') {
                throw error
            }
            return nextResolve(`${specifier}/index.js`, context)
        }
    },
})
after(() => hooks.deregister())

const { resolveFallbackTransport, resolveTransports } = await import('../dist/esm/evmUtils/resolveTransports.js')
const request = { method: 'eth_getBlockByNumber', params: ['latest', false] }
const [primary, secondary] = ['https://primary.invalid', 'https://secondary.invalid']
const nodes = [primary, secondary]
const REQUEST_TIMEOUT_MS = 60000

function mockRpc(t, response) {
    const attempts = []
    const delays = []
    t.mock.method(globalThis, 'fetch', async (url, init) => {
        const endpoint = String(url)
        attempts.push(endpoint)
        const endpointAttempt = attempts.filter(attempt => attempt === endpoint).length
        return response(endpoint, JSON.parse(init.body), endpointAttempt)
    })

    const setTimeoutOriginal = globalThis.setTimeout
    t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => {
        // Record retry backoff and skip waiting for it; leave request timeouts untouched.
        if (delay >= REQUEST_TIMEOUT_MS) {
            return setTimeoutOriginal(callback, delay, ...args)
        }
        delays.push(delay)
        return setTimeoutOriginal(callback, 0, ...args)
    })
    return { attempts, delays }
}

const rateLimited = (retryAfterSeconds) => new Response('Too many requests', {
    status: 429,
    headers: retryAfterSeconds === undefined ? {} : { 'Retry-After': String(retryAfterSeconds) },
})
const failed = (status) => new Response('Failed', { status })
const blockResult = (body) => Response.json({ jsonrpc: '2.0', id: body.id, result: { number: '0x1' } })

for (const [retryCount, attemptsExpected] of [[undefined, 4], [0, 1], [1, 2]]) {
    test(`HTTP 429 honors retryCount=${retryCount ?? 'default'} without multiplying retries`, async t => {
        const { attempts, delays } = mockRpc(t, () => rateLimited())
        const transport = resolveFallbackTransport([primary], { retryCount })({})
        await assert.rejects(transport.request(request))
        assert.equal(attempts.length, attemptsExpected)
        assert.deepEqual(delays, [150, 300, 600].slice(0, attemptsExpected - 1))
    })
}

test('each endpoint retries independently without fallback rounds', async t => {
    const { attempts } = mockRpc(t, () => rateLimited())
    await assert.rejects(resolveFallbackTransport(nodes)({}).request(request))
    assert.deepEqual(attempts, [primary, primary, primary, primary, secondary, secondary, secondary, secondary])
})

test('a healthy secondary answers once the primary exhausts its retries', async t => {
    const { attempts } = mockRpc(t, (url, body) => url === primary ? rateLimited() : blockResult(body))
    assert.deepEqual(await resolveFallbackTransport(nodes)({}).request(request), { number: '0x1' })
    assert.deepEqual(attempts, [primary, primary, primary, primary, secondary])
})

for (const secondaryStatus of [503, 404]) {
    test(`a primary recovering after Retry-After succeeds despite a ${secondaryStatus} secondary`, async t => {
        const { attempts, delays } = mockRpc(t, (url, body, endpointAttempt) => {
            if (url === secondary) {
                return failed(secondaryStatus)
            }
            return endpointAttempt === 1 ? rateLimited(8) : blockResult(body)
        })
        assert.deepEqual(await resolveFallbackTransport(nodes)({}).request(request), { number: '0x1' })
        assert.deepEqual(attempts, [primary, primary])
        assert.deepEqual(delays, [8000])
    })
}

for (const [secondaryStatus, secondaryAttempts, secondaryDelays] of [[503, 4, [150, 300, 600]], [404, 1, []]]) {
    test(`a rate-limited primary keeps its Retry-After when a ${secondaryStatus} secondary also fails`, async t => {
        const { attempts, delays } = mockRpc(t, url => url === primary ? rateLimited(8) : failed(secondaryStatus))
        await assert.rejects(resolveFallbackTransport(nodes)({}).request(request))
        assert.deepEqual(attempts, [
            primary, primary, primary, primary,
            ...Array(secondaryAttempts).fill(secondary),
        ])
        assert.deepEqual(delays, [8000, 8000, 8000, ...secondaryDelays])
    })
}

test('standalone HTTP transports retain their retry budget', async t => {
    const { attempts } = mockRpc(t, () => rateLimited())
    await assert.rejects(resolveTransports([primary])[0]({}).request(request))
    assert.equal(attempts.length, 4)
})
