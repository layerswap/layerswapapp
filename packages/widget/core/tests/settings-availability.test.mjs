import assert from 'node:assert/strict'
import test from 'node:test'
import { loadSource } from './helpers/source.mjs'

function fixture(networkResponse) {
    class ApiClient {
        async GetLSNetworksAsync() { return networkResponse }
        async GetSourceExchangesAsync() { return { data: [] } }
        async GetRoutesAsync() { return { data: [] } }
    }
    return loadSource('helpers/getSettings/getSettings.ts', {
        '../../lib/apiClients/layerSwapApiClient': { default: ApiClient },
        '../../lib/extendedRoutes/remoteFlags': { fetchExtendedRouteFlags: async () => undefined },
    }).getSettings
}

for (const data of [[], null, undefined, {}]) {
    test(`unusable network response ${JSON.stringify(data)} follows the settings failure path`, async t => {
        const errors = t.mock.method(console, 'error', () => {})
        assert.equal(await fixture({ data })('test-key'), null)
        assert.match(errors.mock.calls[0].arguments[1].message, /No networks returned/)
    })
}

test('valid non-EVM settings remain available even with no routes or exchanges', async () => {
    const networks = [{ name: 'SOLANA_DEVNET', type: 'solana' }]
    const settings = await fixture({ data: networks })('test-key')
    assert.equal(settings.networks, networks)
    assert.deepEqual(settings.sourceRoutes, [])
})
