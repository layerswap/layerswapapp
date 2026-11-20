import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { createRequire } from 'node:module'
import { loadSource } from './helpers/source.mjs'

const require = createRequire(import.meta.url)
const historyDb = loadSource('lib/swapRouteHistoryDb.ts')
const historyStore = loadSource('stores/swapRouteHistoryStore.ts', {
    react: require('react'),
    zustand: require('zustand'),
    // These tests do not make API requests; avoid initializing the API client.
    '@/lib/apiClients/layerSwapApiClient': { default: {} },
    '@/lib/swapRouteHistoryDb': historyDb,
})
const {
    buildSwapRouteRecency,
    getRouteRecency,
    hydrateSwapRouteHistory,
    mergeSwapRouteHistoryRecords,
    toPersistedSwapRoute,
    useSwapRouteHistoryStore,
} = historyStore

function response(overrides = {}) {
    return {
        swap: {
            id: overrides.id ?? 'swap-id',
            created_date: overrides.createdDate ?? '2026-01-02T03:04:05.000Z',
            source_network: { name: 'SOURCE' },
            source_token: { symbol: 'SRC' },
            source_exchange: overrides.sourceExchange ? { name: 'EXCHANGE' } : undefined,
            destination_network: { name: 'DESTINATION' },
            destination_token: { symbol: 'DST' },
            status: overrides.status ?? 'Completed',
        },
    }
}

function record(swapId, createdAt, sourceNetwork = 'SOURCE') {
    return {
        swapId,
        environment: 'environment',
        createdAt,
        sourceRoute: { network: sourceNetwork, token: 'SRC' },
        destinationRoute: { network: 'DESTINATION', token: 'DST' },
    }
}

beforeEach(() => {
    useSwapRouteHistoryStore.setState({
        environment: undefined,
        hydratedEnvironment: undefined,
        records: [],
    }, true)
})

describe('compact swap route records', () => {
    for (const status of ['PendingDeposit', 'Completed', 'Refunded']) {
        it(`extracts routes regardless of the ${status} status`, () => {
            const persisted = toPersistedSwapRoute(response({ status }), 'environment')
            assert.deepEqual(persisted, {
                createdAt: Date.parse('2026-01-02T03:04:05.000Z'),
                swapId: 'swap-id',
                environment: 'environment',
                sourceRoute: { network: 'SOURCE', token: 'SRC' },
                destinationRoute: { network: 'DESTINATION', token: 'DST' },
            })
        })
    }

    it('omits exchange sources and supports an extended-route identity override', () => {
        assert.equal(toPersistedSwapRoute(response({ sourceExchange: true }), 'environment')?.sourceRoute, undefined)
        assert.deepEqual(toPersistedSwapRoute(response(), 'environment', {
            sourceRoute: { network: 'EXTENDED', token: 'EXT' },
        })?.sourceRoute, { network: 'EXTENDED', token: 'EXT' })
    })

    it('deduplicates records and indexes the latest use in each direction', () => {
        const records = mergeSwapRouteHistoryRecords([record('same-id', 1), record('older', 2, 'OTHER')], [record('same-id', 3)])
        const recency = buildSwapRouteRecency(records)
        assert.equal(records.length, 2)
        assert.equal(records[0].createdAt, 3)
        assert.equal(getRouteRecency(recency, 'from', 'SOURCE', 'SRC'), 3)
        assert.equal(getRouteRecency(recency, 'to', 'DESTINATION', 'DST'), 3)
    })

    it('does not overwrite an in-memory write that lands during hydration', async () => {
        let resolveRead = () => undefined
        const read = new Promise(resolve => {
            resolveRead = resolve
        })
        const repository = {
            getRecent: () => read,
            upsert: async () => {},
            close: () => {},
        }
        const hydration = hydrateSwapRouteHistory('environment', repository)
        useSwapRouteHistoryStore.setState({
            environment: 'environment',
            records: [record('same-id', 10, 'IN_MEMORY')],
        })
        resolveRead([record('same-id', 1, 'PERSISTED'), record('older', 2, 'OTHER')])
        await hydration
        const state = useSwapRouteHistoryStore.getState()
        assert.equal(state.hydratedEnvironment, 'environment')
        assert.equal(state.records.find(item => item.swapId === 'same-id')?.sourceRoute?.network, 'IN_MEMORY')
        assert.ok(state.records.some(item => item.swapId === 'older'))
    })
})
