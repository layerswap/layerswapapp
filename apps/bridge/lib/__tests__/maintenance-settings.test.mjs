import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const sourceRoot = new URL('../../', import.meta.url)
const widgetRequire = createRequire(new URL('../../packages/widget/core/package.json', sourceRoot))

function load(path, imports, env = {}) {
    const compiled = ts.transpileModule(readFileSync(new URL(path, sourceRoot), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const exports = {}
    vm.runInNewContext(compiled, {
        exports, Buffer, URLSearchParams, console: { error() {} }, process: { env },
        require: name => name in imports ? imports[name] : require(name),
    })
    return exports
}

function response() {
    return {
        statusCode: 200,
        headers: {},
        setHeader(name, value) { this.headers[name] = value },
        status(code) { this.statusCode = code; return this },
        end() { this.ended = true },
    }
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
