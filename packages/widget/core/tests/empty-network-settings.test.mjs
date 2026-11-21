import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function loadSource(path, imports = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name in imports) return imports[name]
        return require(name)
    }, module, module.exports)
    return module.exports
}

const catalog = loadSource('helpers/routeCatalog.ts')
const { compactSettings, encodeSettingsForSSR, inflateSettings } = loadSource('helpers/settingsCompression.ts', {
    './routeCatalog': catalog,
})
const { gzipSync, strToU8 } = require('fflate')
const emptySettings = { networks: [], sourceExchanges: [], sourceRoutes: [], destinationRoutes: [] }

function encodeLegacySettings(settings) {
    return {
        __encodedSettingsV1: true,
        algorithm: 'gzip-base64',
        payload: Buffer.from(gzipSync(strToU8(JSON.stringify(settings)))).toString('base64'),
    }
}

test('empty network settings remain unavailable across SSR encoding and inflation', () => {
    assert.equal(compactSettings(emptySettings), null)
    assert.equal(encodeSettingsForSSR(emptySettings), null)
    assert.equal(inflateSettings(emptySettings), null)
    const compressed = { ...emptySettings, __compressedSettingsV1: true }
    assert.equal(inflateSettings(compressed), null)
    const encoded = encodeLegacySettings(compressed)
    assert.equal(inflateSettings(encoded), null)
    assert.equal(inflateSettings(encoded), null) // Cached results retain the maintenance state.
    assert.equal(inflateSettings(null), null)
    assert.equal(inflateSettings({ featureFlags: {} }), null)
})

test('valid network settings survive the SSR round trip', () => {
    const settings = { ...emptySettings, networks: [{ name: 'ETHEREUM_MAINNET', display_name: 'Ethereum', tokens: [] }], featureFlags: {} }
    assert.deepEqual(inflateSettings(encodeSettingsForSSR(settings)), settings)
})

test('a successful networks API response with an empty array is rejected', async () => {
    class ApiClient {
        GetLSNetworksAsync() { return Promise.resolve({ data: [] }) }
        GetSourceExchangesAsync() { return Promise.resolve({ data: [] }) }
        GetRoutesAsync() { return Promise.resolve({ data: [] }) }
    }
    const { getSettings } = loadSource('helpers/getSettings/getSettings.ts', {
        '../../lib/apiClients/layerSwapApiClient': { default: ApiClient },
        '../../lib/extendedRoutes/remoteFlags': { fetchExtendedRouteFlags: async () => undefined },
    })
    assert.equal(await getSettings('mainnet'), null)
})

test('catalog skew removes only unresolvable routes from raw, compact and encoded settings', () => {
    const bnb = { symbol: 'BNB', asset: 'BNB', decimals: 18, price_in_usd: 600, source_rank: 5 }
    const invalid = { symbol: 'BAD', decimals: 6 }
    const token = { symbol: 'USDC', asset: 'USDC', decimals: 6, price_in_usd: 1 }
    const missing = { symbol: 'BNBTiger', asset: 'BNBTiger', decimals: 9 }
    const bsc = { name: 'BSC_MAINNET', display_name: 'BSC', tokens: [bnb, null, invalid, token] }
    const base = { name: 'BASE_MAINNET', display_name: 'Base', tokens: [token] }
    const routes = [
        null,
        { ...bsc, tokens: [null, missing, { ...bnb, status: 'active', source_rank: 0 }, invalid, token] },
        { ...base, tokens: [missing] },
        { ...base, name: 'UNKNOWN' },
    ]
    const settings = { ...emptySettings, networks: [bsc, base], sourceRoutes: routes, destinationRoutes: routes }
    for (const input of [settings, compactSettings(settings), encodeSettingsForSSR(settings)]) {
        const resolved = inflateSettings(input)
        assert.deepEqual(resolved.networks[0].tokens, [bnb, token])
        for (const list of [resolved.sourceRoutes, resolved.destinationRoutes]) {
            assert.deepEqual(list.map(route => route.name), ['BSC_MAINNET'])
            const tokens = list[0].tokens
            assert.deepEqual(tokens.map(t => t.asset).sort((a, b) => a.localeCompare(b)), ['BNB', 'USDC'])
            assert.equal(tokens[0].source_rank, 0)
            assert.equal(tokens[0].status, 'active')
            assert.equal(tokens[0].decimals, 18)
        }
    }
})

test('full route responses preserve route-specific metadata and zero-valued overrides', () => {
    const base = { symbol: 'USDC', asset: 'USDC', decimals: 6, price_in_usd: 1, supports_gasless_deposit: true }
    const network = { name: 'BASE_MAINNET', display_name: 'Base', tokens: [base] }
    const route = {
        ...network, deposit_methods: [], token: { symbol: 'ETH', status: 'active' },
        tokens: [{ ...base, destination_rank: 0, price_in_usd: 0, supports_gasless_deposit: false }],
    }
    const [resolved] = catalog.resolveCatalogRoutes([route], catalog.indexRouteCatalog([network]))
    assert.deepEqual(resolved.token, route.token)
    assert.deepEqual(resolved.deposit_methods, [])
    assert.equal(resolved.tokens[0].destination_rank, 0)
    assert.equal(resolved.tokens[0].price_in_usd, 0)
    assert.equal(resolved.tokens[0].supports_gasless_deposit, false)
})
