import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { Provider } from '@fuel-ts/account'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) }
            catch (error) {
                if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
                return nextResolve(`${specifier}/index.js`, context)
            }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())
const { resolveFuelChainId } = await import('../dist/esm/service/resolveFuelChainId.js')
const { ensureFuelChain } = await import('../dist/esm/service/ensureFuelChain.js')
const settle = () => new Promise(resolve => setImmediate(resolve))

test('metadata resolution matches configured endpoints and keeps unknown endpoints unknown', () => {
    const known = [{ chainId: '0', rpcUrls: ['https://custom.fuel.example/graphql'] }]
    assert.equal(resolveFuelChainId({ url: 'https://custom.fuel.example/graphql/' }, known), 0)
    assert.equal(resolveFuelChainId({ chainId: 9889, url: 'https://custom.fuel.example/graphql' }, known), 9889)
    assert.equal(resolveFuelChainId({ url: 'https://unknown-testnet.fuel.example' }, known), undefined)
    assert.equal(resolveFuelChainId({ url: 'not a URL' }, known), undefined)
    assert.equal(resolveFuelChainId({ url: 'https://custom.fuel.example/graphql?key=value/' }, [
        { chainId: 0, rpcUrls: ['https://custom.fuel.example/graphql?key=value'] },
    ]), undefined, 'URL normalization must preserve query parameters')
})

test('a known legacy endpoint needs no RPC lookup or switch at send time', async t => {
    t.mock.method(globalThis, 'fetch', () => assert.fail('known metadata must not trigger RPC discovery'))
    await ensureFuelChain({
        chainId: 0,
        knownNetworks: [{ chainId: 0, rpcUrls: ['https://known.fuel.example'] }],
        connector: {
            currentNetwork: async () => ({ url: 'https://known.fuel.example/' }),
            selectNetwork: () => assert.fail('already on the target chain'),
        },
    })
})

test('unknown legacy endpoints are queried only during send readiness', async t => {
    const discovery = t.mock.method(Provider.prototype, 'getChainId', async () => 0)
    await ensureFuelChain({
        chainId: 0,
        connector: {
            currentNetwork: async () => ({ url: 'https://unknown.fuel.example' }),
            selectNetwork: () => assert.fail('RPC confirmed the target chain'),
        },
    })
    assert.equal(discovery.mock.callCount(), 1)
})

for (const [from, to] of [[0, 9889], [9889, 0]]) {
    test(`live readiness switches from ${from} to ${to} and verifies the result`, async () => {
        let chainId = from
        const events = []
        await ensureFuelChain({
            chainId: to,
            onSwitchStart: () => events.push('switch_started'),
            connector: {
                currentNetwork: async () => { events.push(`read_${chainId}`); return { chainId } },
                selectNetwork: async target => { events.push('select'); chainId = target.chainId; return true },
            },
        })
        assert.deepEqual(events, [`read_${from}`, 'switch_started', 'select', `read_${to}`])
    })
}

test('a final verification cannot open another network prompt', async () => {
    await assert.rejects(ensureFuelChain({
        chainId: 9889,
        allowSwitch: false,
        displayName: 'Fuel mainnet',
        connector: {
            currentNetwork: async () => ({ chainId: 0 }),
            selectNetwork: () => assert.fail('verification must not switch'),
        },
    }), /Switch your Fuel wallet to Fuel mainnet/)
})

test('cancellation during a network read prevents a later switch', async () => {
    const controller = new AbortController()
    const network = Promise.withResolvers()
    const pending = ensureFuelChain({
        chainId: 9889,
        signal: controller.signal,
        connector: {
            currentNetwork: () => network.promise,
            selectNetwork: () => assert.fail('cancelled readiness must not open a prompt'),
        },
    })
    controller.abort()
    await assert.rejects(pending, { name: 'AbortError' })
    network.resolve({ chainId: 0 })
    await settle()
})

test('one deadline covers both the initial read and the switch', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const network = Promise.withResolvers()
    let prompted = false
    const pending = ensureFuelChain({
        chainId: 9889, timeoutMs: 1000,
        connector: {
            currentNetwork: () => network.promise,
            selectNetwork: () => { prompted = true; return new Promise(() => {}) },
        },
    })
    const failed = assert.rejects(pending, error => error.reasonCode === 'timeout')
    t.mock.timers.tick(600)
    network.resolve({ chainId: 0 })
    await settle()
    assert.equal(prompted, true)
    t.mock.timers.tick(400)
    await failed
})

test('the operation deadline aborts its own discovery fetch without retries', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const started = Promise.withResolvers()
    const fetch = t.mock.method(globalThis, 'fetch', async (_url, init) => {
        started.resolve(init.signal)
        return new Promise((_, reject) => {
            init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })
        })
    })
    const url = 'https://own-deadline.fuel.example'
    t.after(() => Provider.clearChainAndNodeCaches(url))
    const pending = ensureFuelChain({
        chainId: 9889, timeoutMs: 1000,
        connector: {
            currentNetwork: async () => ({ url }),
            selectNetwork: () => assert.fail('discovery never confirmed another chain'),
        },
    })
    const failed = assert.rejects(pending, error => error.reasonCode === 'timeout')
    const signal = await started.promise
    t.mock.timers.tick(1000)
    await failed
    assert.equal(signal.aborted, true)
    assert.equal(fetch.mock.callCount(), 1)
})

test('the readiness deadline also bounds a shared RPC request started without a timeout', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const started = Promise.withResolvers()
    const stalled = Promise.withResolvers()
    const fetch = t.mock.method(globalThis, 'fetch', async () => { started.resolve(); return stalled.promise })
    const url = 'https://shared-deadline.fuel.example'
    const original = new Provider(url).getChainId().catch(error => error)
    t.after(async () => {
        stalled.reject(new Error('Release original shared request'))
        await original
        Provider.clearChainAndNodeCaches(url)
    })
    await started.promise

    const pending = ensureFuelChain({
        chainId: 9889, timeoutMs: 1000,
        connector: {
            currentNetwork: async () => ({ url }),
            selectNetwork: () => assert.fail('shared discovery never completed'),
        },
    })
    const failed = assert.rejects(pending, error => error.reasonCode === 'timeout')
    await settle()
    assert.equal(fetch.mock.callCount(), 1, 'discovery joined the existing SDK request')
    t.mock.timers.tick(1000)
    await failed
})
