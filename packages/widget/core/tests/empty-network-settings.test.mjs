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

const { compactSettings, encodeSettingsForSSR, inflateSettings } = loadSource('helpers/settingsCompression.ts')
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
    const settings = { ...emptySettings, networks: [{ name: 'ETHEREUM_MAINNET', tokens: [] }], featureFlags: {} }
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
