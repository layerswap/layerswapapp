import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { createPublicClient, custom } from 'viem'

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
const { isRpcRateLimitError } = await import('../dist/esm/evmUtils/isRpcRateLimitError.js')
const { resolveEVMFeeData, resolveEVMFeeQuote } = await import('../dist/esm/gasProviders/resolveEVMFeeData.js')
const { default: resolveChain } = await import('../dist/esm/evmUtils/resolveChain.js')
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
        assert.deepEqual(delays, [1000, 2000, 4000].slice(0, attemptsExpected - 1))
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

test('rate-limit detection handles nested errors and cycles', () => {
    for (const error of [{ status: 429 }, { code: 429 }, { code: -32005 }, new Error('rate limit exceeded'), new Error('Too many requests')]) {
        assert.equal(isRpcRateLimitError(new Error('Fee estimation failed', { cause: error })), true)
    }
    const cyclic = new Error('Method not supported')
    cyclic.cause = cyclic
    assert.equal(isRpcRateLimitError(cyclic), false)
    assert.equal(isRpcRateLimitError(null), false)
})

const network = (chainId = 13371, urls = [nodes[0]]) => ({
    chain_id: String(chainId), name: `CHAIN_${chainId}`, display_name: 'Test network',
    token: { symbol: 'ETH', decimals: 18 }, nodes: urls, node_url: urls[0],
})

function feeClient(net, blockError) {
    const methods = []
    const client = createPublicClient({
        chain: resolveChain(net),
        transport: custom({ request: async ({ method }) => {
            methods.push(method)
            if (method === 'eth_getBlockByNumber') {
                if (blockError) throw blockError
                return { number: '0x1', baseFeePerGas: '0x64', transactions: [] }
            }
            if (method === 'eth_gasPrice') return '0x64'
            if (method === 'eth_maxPriorityFeePerGas') return '0x1'
            assert.fail(`Unexpected method ${method}`)
        } }, { retryCount: 0 }),
    })
    return { client, methods }
}

test('a rate-limited block read aborts fee fallbacks instead of issuing more reads', async () => {
    const net = network()
    const { client, methods } = feeClient(net, { code: -32005, message: 'Rate limit exceeded' })
    await assert.rejects(resolveEVMFeeData(client, net), isRpcRateLimitError)
    assert.equal(methods.filter(method => method === 'eth_getBlockByNumber').length, 1)
    assert.equal(methods.includes('eth_maxPriorityFeePerGas'), false)
})

test('ordinary fee estimation failures still allow the priority-fee fallback', async () => {
    const net = network()
    const { client, methods } = feeClient(net, { code: -32601, message: 'Method not found' })
    const fees = await resolveEVMFeeData(client, net)
    assert.equal(fees.gasPrice, 100n)
    assert.equal(fees.maxPriorityFeePerGas, 1n)
    assert.ok(methods.includes('eth_maxPriorityFeePerGas'))
})

test('concurrent quotes share chain fees across public client instances', async () => {
    const net = network()
    const first = feeClient(net)
    const second = feeClient(net)
    const [one, two] = await Promise.all([
        resolveEVMFeeQuote(first.client, net), resolveEVMFeeQuote(second.client, net),
    ])
    assert.deepEqual(one, two)
    assert.equal(first.methods.filter(method => method === 'eth_getBlockByNumber').length, 1)
    assert.deepEqual(second.methods, [])
    // The next quote reads current fees again, with no retained stale value.
    await resolveEVMFeeQuote(second.client, net)
    assert.ok(second.methods.includes('eth_getBlockByNumber'))
})

test('transaction fee preparation does not reuse an in-flight quote', async () => {
    const net = network()
    const quote = feeClient(net)
    const submission = feeClient(net)
    await Promise.all([
        resolveEVMFeeQuote(quote.client, net), resolveEVMFeeData(submission.client, net),
    ])
    assert.ok(quote.methods.includes('eth_getBlockByNumber'))
    assert.ok(submission.methods.includes('eth_getBlockByNumber'))
})

test('quotes with different chains or endpoints are not deduplicated', async () => {
    const nets = [network(), network(13473), network(13371, [nodes[1]])]
    const clients = nets.map(net => feeClient(net))
    await Promise.all(clients.map(({ client }, index) => resolveEVMFeeQuote(client, nets[index])))
    for (const { methods } of clients) {
        assert.ok(methods.includes('eth_getBlockByNumber'))
    }
})

test('a failed shared quote is removed so a later quote can recover', async () => {
    const net = network()
    const failed = feeClient(net, { code: -32005, message: 'Rate limit exceeded' })
    const other = feeClient(net)
    const outcomes = await Promise.allSettled([
        resolveEVMFeeQuote(failed.client, net), resolveEVMFeeQuote(other.client, net),
    ])
    assert.deepEqual(outcomes.map(outcome => outcome.status), ['rejected', 'rejected'])
    assert.deepEqual(other.methods, [])
    const recovered = await resolveEVMFeeQuote(other.client, net)
    assert.equal(recovered.maxPriorityFeePerGas, 1n)
})
