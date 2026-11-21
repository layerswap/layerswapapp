import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const compiled = compile('../maintenanceRecovery.ts')
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }

function harness(fetcher, { hidden = false, online = true } = {}) {
    const timers = new Map()
    const window = new EventTarget()
    const document = Object.assign(new EventTarget(), { visibilityState: hidden ? 'hidden' : 'visible' })
    const navigator = { onLine: online }
    const requests = []
    const checking = []
    let recoveries = 0
    let id = 0
    const exports = {}
    vm.runInNewContext(compiled, {
        exports, window, document, navigator, AbortController,
        Math: { random: () => 0, min: Math.min },
        setTimeout: (fn, delay) => { const key = ++id; timers.set(key, { fn, delay }); return key },
        clearTimeout: key => timers.delete(key),
        fetch: (url, options) => { requests.push({ url, options }); return fetcher(url, options) },
    })
    const session = exports.startMaintenanceRecovery('/bridge/api/settings-health?appName=partner', () => recoveries++, value => checking.push(value))
    return {
        session, requests, checking, timers, window, document, navigator,
        recoveries: () => recoveries,
        async tick() {
            const [key, timer] = [...timers].sort((a, b) => a[1].delay - b[1].delay)[0]
            timers.delete(key)
            timer.fn()
            await flush()
            return timer.delay
        },
    }
}

test('backs off through an outage and reloads exactly once when readiness recovers', async () => {
    let status = 503
    const h = harness(async () => ({ status }))
    await flush()
    assert.equal(h.requests.length, 1)
    for (const delay of [15_000, 30_000, 60_000, 60_000]) {
        assert.equal(await h.tick(), delay)
        assert.equal(h.recoveries(), 0)
    }
    status = 204
    await h.tick()
    assert.equal(h.recoveries(), 1)
    assert.equal(h.timers.size, 0)
    await h.session.retry()
    h.window.dispatchEvent(new Event('online'))
    assert.equal(h.recoveries(), 1)
    for (const { url, options } of h.requests) {
        assert.equal(url, '/bridge/api/settings-health?appName=partner')
        assert.equal(options.cache, 'no-store')
    }
    h.session.dispose()
})

test('network failures, timeouts, and unexpected 200 pages do not reload', async () => {
    for (const fetcher of [
        async () => { throw new Error('offline') },
        async () => ({ status: 200 }),
    ]) {
        const h = harness(fetcher)
        await flush()
        assert.equal(h.recoveries(), 0)
        assert.equal(await h.tick(), 15_000)
        h.session.dispose()
        assert.equal(h.timers.size, 0)
    }
    const h = harness((_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')))
    }))
    await h.session.retry()
    assert.equal(h.requests.length, 1, 'manual retry cannot overlap an active probe')
    assert.equal(await h.tick(), 10_000)
    assert.equal(h.requests[0].options.signal.aborted, true)
    assert.equal(h.recoveries(), 0)
    assert.deepEqual(h.checking, [true, false])
    h.session.dispose()
    assert.equal(h.timers.size, 0)
})

test('hidden and offline tabs pause requests and resume when visible or online', async () => {
    const h = harness(async () => ({ status: 204 }), { hidden: true, online: false })
    assert.equal(h.requests.length, 0)
    await h.tick()
    assert.equal(h.requests.length, 0)
    h.document.visibilityState = 'visible'
    h.document.dispatchEvent(new Event('visibilitychange'))
    assert.equal(h.requests.length, 0)
    h.navigator.onLine = true
    h.window.dispatchEvent(new Event('online'))
    await flush()
    assert.equal(h.recoveries(), 1)
    assert.equal(h.timers.size, 0)
    h.session.dispose()
})

test('unmount aborts the active probe and ignores late success without restarting timers', async () => {
    let resolve
    const h = harness(() => new Promise(done => { resolve = done }))
    h.session.dispose()
    assert.equal(h.requests[0].options.signal.aborted, true)
    resolve({ status: 204 })
    await flush()
    assert.equal(h.recoveries(), 0)
    assert.equal(h.timers.size, 0)
    assert.deepEqual(h.checking, [true])
    h.window.dispatchEvent(new Event('online'))
    h.document.dispatchEvent(new Event('visibilitychange'))
    assert.equal(h.requests.length, 1)
})

test('maintenance hook preserves base path and partner selection and uses network-only recovery for swaps', () => {
    const compiledHook = compile('../../hooks/useMaintenanceRecovery.ts')
    for (const pathname of ['/', '/swap/[swapId]']) {
        const effects = []
        let url, onRecovered, disposed = false, reloaded = false
        const exports = {}
        const router = { isReady: true, pathname, asPath: '/?appName=a%26b&amount=10', basePath: '/bridge', query: { appName: 'a&b', addressSource: 'fallback', amount: '10' } }
        vm.runInNewContext(compiledHook, {
            exports, URLSearchParams, window: { location: { reload: () => { reloaded = true } } },
            require: name => ({
                react: { useEffect: effect => effects.push(effect), useRef: value => ({ current: value }), useState: value => [value, () => {}] },
                'next/router': { useRouter: () => router },
                '../lib/maintenanceRecovery': { startMaintenanceRecovery: (value, recovered) => {
                    url = value; onRecovered = recovered
                    return { retry() {}, dispose() { disposed = true } }
                } },
            })[name],
        })
        exports.useMaintenanceRecovery()
        const cleanup = effects[0]()
        const parsed = new URL(url, 'https://example.com')
        assert.equal(parsed.pathname, '/bridge/api/settings-health')
        assert.equal(parsed.searchParams.get('appName'), 'a&b')
        assert.equal(parsed.searchParams.get('addressSource'), 'fallback')
        assert.equal(parsed.searchParams.has('amount'), false)
        assert.equal(parsed.searchParams.get('scope'), pathname === '/' ? null : 'networks')
        onRecovered()
        assert.equal(reloaded, true)
        cleanup()
        assert.equal(disposed, true)
    }
})
