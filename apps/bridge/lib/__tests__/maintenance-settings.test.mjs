import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const sourceRoot = new URL('../../', import.meta.url)
const widgetRequire = createRequire(new URL('../../packages/widget/core/package.json', sourceRoot))

function load(path, imports, env = {}, globals = {}) {
    const compiled = ts.transpileModule(readFileSync(new URL(path, sourceRoot), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const exports = {}
    vm.runInNewContext(compiled, {
        exports, Buffer, URLSearchParams, AbortController, setTimeout, clearTimeout,
        console: { error() {} }, process: { env }, ...globals,
        require: name => name in imports ? imports[name] : require(name),
    })
    return exports
}

function response() {
    return Object.assign(new EventEmitter(), {
        statusCode: 200,
        headers: {},
        setHeader(name, value) { this.headers[name] = value },
        status(code) { this.statusCode = code; return this },
        end() { this.ended = true },
    })
}

function harness() {
    let failure
    const calls = []
    const networks = [{ name: 'ETHEREUM_MAINNET', tokens: [] }]
    class ApiClient {
        async GetLSNetworksAsync() {
            calls.push('networks')
            if (failure === 'networks') throw new Error('backend down')
            return { data: failure === 'empty-networks' ? [] : networks }
        }
        async GetSourceExchangesAsync() {
            if (failure === 'exchanges') throw new Error('backend down')
            return { data: [] }
        }
        async GetRoutesAsync(direction) {
            calls.push(direction)
            if (failure === direction) throw new Error('backend down')
            return { data: [] }
        }
        async GetSwapAsync() {
            return { data: { swap: { transactions: [{ id: 'tx' }] } } }
        }
    }
    const { getSettings } = load('../../packages/widget/core/src/helpers/getSettings/getSettings.ts', {
        '../../lib/apiClients/layerSwapApiClient': { default: ApiClient },
        '../../lib/extendedRoutes/remoteFlags': { fetchExtendedRouteFlags: async () => undefined },
    })
    const compression = load('../../packages/widget/core/src/helpers/settingsCompression.ts', {
        fflate: widgetRequire('fflate'),
    })
    const settingsResponse = load('helpers/settingsResponse.ts', {})
    const widget = { getSettings, ...compression }
    const internal = { LayerswapApiClient: ApiClient, AppSettings: { LayerswapApiUri: 'https://default.invalid' } }
    const env = { NEXT_PUBLIC_API_KEY: 'mainnet', NEXT_PUBLIC_LS_API: 'https://backend.invalid', API_KEYS: '{"partner":"partner-key"}' }
    const { getServerSideProps } = load('helpers/getSettings.ts', {
        './settingsHelper': { getThemeData: async () => null },
        '@layerswap/widget': widget,
        '@layerswap/widget/internal': internal,
        './querryHelper': { resolvePersistantQueryParams: query => query },
        '../flags': { resolveExtendedRouteFlags: async () => ({ hyperliquid: false }) },
        './settingsResponse': settingsResponse,
    }, env)
    const { default: health } = load('pages/api/settings-health.ts', {
        '@layerswap/widget': widget,
        '@layerswap/widget/internal': internal,
    }, env)
    const { getServerSideProps: swapProps } = load('pages/swap/[swapId].tsx', {
        'react/jsx-runtime': {}, react: {}, 'next/router': {},
        '@layerswap/widget': widget, '@layerswap/widget/internal': internal,
        '../../helpers/settingsHelper': { getThemeData: async () => null },
        '../../helpers/querryHelper': {}, '../../components/layout': {},
        '../../components/WidgetWrapper': {}, '../../components/maintanance/maintanance': {},
        '../../flags': { resolveExtendedRouteFlags: async () => ({}) },
        '../../helpers/settingsResponse': settingsResponse,
    }, env)
    return {
        ApiClient, calls, fail(value) { failure = value },
        async page() {
            const res = response()
            const result = await getServerSideProps({ res, req: {}, query: {} })
            return { res, result }
        },
        async probe(query = {}, method = 'GET') {
            const res = response()
            await health({ query, method }, res)
            return res
        },
        async swap() {
            const res = response()
            const result = await swapProps({ res, req: {}, query: {}, params: { swapId: '00000000-0000-4000-8000-000000000000' } })
            return { res, result }
        },
    }
}

for (const failure of ['networks', 'sources', 'destinations', 'empty-networks']) {
    test(`healthy page → ${failure} outage → recovery never caches maintenance as success`, async () => {
        const h = harness()
        let { res, result } = await h.page()
        assert.ok(result.props.settings)
        assert.equal(res.statusCode, 200)
        assert.match(res.headers['Cache-Control'], /s-maxage=60/)
        assert.match(res.headers['Cache-Control'], /stale-while-revalidate=60/)
        assert.match(res.headers['Cache-Control'], /stale-if-error=300/)

        h.fail(failure)
        ;({ res, result } = await h.page())
        assert.equal(result.props.settings, null)
        assert.equal(res.statusCode, 503)
        assert.equal(res.headers['Cache-Control'], 'private, no-store')
        assert.equal(res.headers['Retry-After'], '15')
        assert.equal((await h.probe()).statusCode, 503)

        h.fail(undefined)
        const probe = await h.probe()
        assert.equal(probe.statusCode, 204)
        assert.equal(probe.headers['Cache-Control'], 'private, no-store')
        ;({ res, result } = await h.page())
        assert.equal(res.statusCode, 200)
        assert.ok(result.props.settings)
    })
}

test('optional exchange errors still produce a healthy page and readiness response', async () => {
    const h = harness()
    h.fail('exchanges')
    assert.ok((await h.page()).result.props.settings)
    assert.equal((await h.probe()).statusCode, 204)
})

test('readiness honors partner keys and backend URL without returning settings or keys', async () => {
    const h = harness()
    for (const query of [{ appName: 'partner' }, { addressSource: 'partner' }]) {
        const res = await h.probe(query)
        assert.equal(res.statusCode, 204)
        assert.equal(res.ended, true)
        assert.equal(h.ApiClient.apiKey, 'partner-key')
        assert.equal(h.ApiClient.apiBaseEndpoint, 'https://backend.invalid')
        assert.ok(!JSON.stringify(res).includes('partner-key'))
    }
    await h.probe({ appName: 'unknown' })
    assert.equal(h.ApiClient.apiKey, 'mainnet')
    assert.equal((await h.probe({}, 'POST')).statusCode, 405)
})

test('swap details remain uncached and recover from networks without requiring route lists', async () => {
    const h = harness()
    h.fail('sources')
    let { res, result } = await h.swap()
    assert.ok(result.props.settings)
    assert.equal(res.statusCode, 200)
    assert.equal(res.headers['Cache-Control'], 'private, no-store')
    assert.equal((await h.probe({ scope: 'networks' })).statusCode, 204)
    assert.ok(!h.calls.includes('sources'))
    for (const failure of ['networks', 'empty-networks']) {
        h.fail(failure)
        ;({ res, result } = await h.swap())
        assert.equal(result.props.settings, null)
        assert.equal(res.statusCode, 503)
        assert.equal(res.headers['Cache-Control'], 'private, no-store')
        assert.equal((await h.probe({ scope: 'networks' })).statusCode, 503)
    }
})

function cancellationHarness(mode = 'hang') {
    const axios = widgetRequire('axios')
    const timers = new Map()
    const requests = []
    const errors = []
    const adapter = config => new Promise((resolve, reject) => {
        const request = { config, pending: true, aborted: false }
        requests.push(request)
        const abort = () => {
            request.pending = false
            request.aborted = true
            config.signal.removeEventListener('abort', abort)
            reject(new axios.CanceledError())
        }
        if (config.signal?.aborted) {
            abort()
            return
        }
        config.signal?.addEventListener('abort', abort)
        const isRequiredRequest = !config.url.endsWith('/source_exchanges')
        const shouldResolve = mode === 'healthy' || (mode === 'hanging-exchanges' && isRequiredRequest)
        const shouldFail = mode === 'partial-failure' && config.url.endsWith('/networks')
        if (shouldResolve || shouldFail) {
            request.pending = false
            config.signal?.removeEventListener('abort', abort)
            if (mode === 'partial-failure') {
                reject(new Error('networks failed'))
            } else {
                resolve({ config, status: 200, headers: {}, data: { data: [{ name: 'ETHEREUM_MAINNET', tokens: [] }] } })
            }
        }
    })
    const { default: ApiClient } = load('../../packages/widget/core/src/lib/apiClients/layerSwapApiClient.ts', {
        '../AppSettings': { default: { LayerswapApiUri: 'https://backend.invalid', LayerswapApiKeys: { mainnet: 'mainnet' } } },
        '../axiosInterceptor': { InitializeAuthInstance: () => axios.create(), InitializeUnauthInstance: () => axios.create({ adapter }) },
        'uuid': { v4: () => 'test-id' },
        '../Errors/AuthRefreshFailedError': { AuthRefreshFailedError: class extends Error {} },
        '@layerswap/widget-types': { EmptyApiResponse: class {} },
        '@/lib/ErrorHandler': { ErrorHandler: error => errors.push(error) },
        '../widgetTelemetry': { startApiOperation: () => () => {} },
        '../atomicBatchActions': {},
    })
    const { getSettings } = load('../../packages/widget/core/src/helpers/getSettings/getSettings.ts', {
        '../../lib/apiClients/layerSwapApiClient': { default: ApiClient },
        '../../lib/extendedRoutes/remoteFlags': {},
    })
    const { default: health } = load('pages/api/settings-health.ts', {
        '@layerswap/widget': { getSettings },
        '@layerswap/widget/internal': { LayerswapApiClient: ApiClient, AppSettings: { LayerswapApiUri: 'https://backend.invalid' } },
    }, { NEXT_PUBLIC_API_KEY: 'mainnet' }, {
        setTimeout: (fn, delay) => { timers.set(fn, delay); return fn },
        clearTimeout: fn => timers.delete(fn),
    })
    return {
        requests, errors, timers,
        start(query = {}) {
            const res = response()
            const done = health({ method: 'GET', query }, res)
            return { res, done }
        },
        expire() {
            const [[callback, delay]] = timers
            assert.equal(delay, 8_000, 'server deadline precedes the ten-second browser timeout')
            callback()
        },
    }
}

for (const scope of ['all', 'networks']) {
    test(`${scope} readiness aborts real Axios requests at its deadline before the next probe`, async () => {
        const h = cancellationHarness()
        const query = scope === 'networks' ? { scope } : {}
        const requestCount = scope === 'networks' ? 1 : 4
        for (let attempt = 1; attempt <= 2; attempt++) {
            const { res, done } = h.start(query)
            await Promise.resolve()
            assert.equal(h.requests.filter(request => request.pending).length, requestCount)
            h.expire()
            await done
            assert.equal(res.statusCode, 503)
            assert.equal(res.headers['Cache-Control'], 'private, no-store')
            assert.equal(res.headers['Retry-After'], '15')
            assert.equal(h.requests.length, attempt * requestCount)
            assert.ok(h.requests.every(request => request.aborted && !request.pending))
            assert.equal(h.timers.size, 0)
            assert.equal(res.listenerCount('close'), 0)
        }
        assert.equal(h.errors.length, 0, 'expected cancellations are not reported as backend errors')
    })

    test(`${scope} readiness cancels upstream work on disconnect without writing a response`, async () => {
        const h = cancellationHarness()
        const { res, done } = h.start(scope === 'networks' ? { scope } : {})
        await Promise.resolve()
        res.destroyed = true
        res.emit('close')
        await done
        assert.ok(h.requests.length > 0)
        assert.ok(h.requests.every(request => request.aborted && !request.pending))
        assert.equal(res.ended, undefined)
        assert.equal(h.timers.size, 0)
        assert.equal(res.listenerCount('close'), 0)
    })
}

test('an early settings failure cancels the sibling requests instead of leaving them without a deadline', async () => {
    const h = cancellationHarness('partial-failure')
    const { res, done } = h.start()
    await done
    assert.equal(res.statusCode, 503)
    assert.equal(h.requests.length, 4)
    assert.equal(h.requests.filter(request => request.aborted).length, 3)
    assert.ok(h.requests.every(request => !request.pending))
    assert.equal(h.timers.size, 0)
    assert.equal(res.listenerCount('close'), 0)
})

test('healthy readiness cleans up its deadline and disconnect listener', async () => {
    const h = cancellationHarness('healthy')
    const { res, done } = h.start()
    await done
    assert.equal(res.statusCode, 204)
    assert.equal(h.requests.length, 4)
    assert.ok(h.requests.every(request => !request.pending && !request.aborted))
    assert.equal(h.timers.size, 0)
    assert.equal(res.listenerCount('close'), 0)
})

test('readiness stays unavailable when only the optional exchanges request exceeds the deadline', async () => {
    const h = cancellationHarness('hanging-exchanges')
    const { res, done } = h.start()
    // Let the required requests fully settle before expiring the exchange request.
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.requests.length, 4)
    const pendingRequests = h.requests.filter(request => request.pending)
    assert.equal(pendingRequests.length, 1)
    assert.ok(pendingRequests[0].config.url.endsWith('/source_exchanges'))

    h.expire()
    await done

    assert.equal(res.statusCode, 503)
    assert.equal(res.headers['Cache-Control'], 'private, no-store')
    assert.equal(res.headers['Retry-After'], '15')
    assert.equal(res.ended, true)
    assert.equal(h.requests.filter(request => request.aborted).length, 1)
    assert.ok(h.requests.every(request => !request.pending))
    assert.equal(h.timers.size, 0)
    assert.equal(res.listenerCount('close'), 0)
    assert.equal(h.errors.length, 0)
})
