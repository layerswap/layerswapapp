import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import type { PersistedSwapRoute, SwapRouteHistoryRepository } from '@/lib/swapRouteHistoryDb'
import {
    buildSwapRouteRecency,
    getRouteRecency,
    hydrateSwapRouteHistory,
    mergeSwapRouteHistoryRecords,
    toPersistedSwapRoute,
    useSwapRouteHistoryStore,
} from '@/stores/swapRouteHistoryStore'

function response(overrides: {
    id?: string;
    createdDate?: string;
    sourceExchange?: boolean;
    status?: string;
} = {}): SwapResponse {
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
    } as SwapResponse
}

function record(
    swapId: string,
    createdAt: number,
    sourceNetwork: string = 'SOURCE',
): PersistedSwapRoute {
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
    it.each(['PendingDeposit', 'Completed', 'Refunded'])(
        'extracts routes regardless of the %s status',
        status => {
            const persisted = toPersistedSwapRoute(response({ status }), 'environment')

            expect(persisted).toMatchObject({
                swapId: 'swap-id',
                environment: 'environment',
                sourceRoute: { network: 'SOURCE', token: 'SRC' },
                destinationRoute: { network: 'DESTINATION', token: 'DST' },
            })
        },
    )

    it('omits exchange sources and supports an extended-route identity override', () => {
        expect(toPersistedSwapRoute(response({ sourceExchange: true }), 'environment')?.sourceRoute).toBeUndefined()

        expect(toPersistedSwapRoute(response(), 'environment', {
            sourceRoute: { network: 'EXTENDED', token: 'EXT' },
        })?.sourceRoute).toEqual({ network: 'EXTENDED', token: 'EXT' })
    })

    it('deduplicates records and indexes the latest use in each direction', () => {
        const records = mergeSwapRouteHistoryRecords(
            [record('same-id', 1), record('older', 2, 'OTHER')],
            [record('same-id', 3)],
        )
        const recency = buildSwapRouteRecency(records)

        expect(records).toHaveLength(2)
        expect(records[0].createdAt).toBe(3)
        expect(getRouteRecency(recency, 'from', 'SOURCE', 'SRC')).toBe(3)
        expect(getRouteRecency(recency, 'to', 'DESTINATION', 'DST')).toBe(3)
    })

    it('does not overwrite an in-memory write that lands during hydration', async () => {
        let resolveRead: (records: PersistedSwapRoute[]) => void = () => undefined
        const read = new Promise<PersistedSwapRoute[]>(resolve => {
            resolveRead = resolve
        })
        const repository: SwapRouteHistoryRepository = {
            getRecent: () => read,
            upsert: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        const hydration = hydrateSwapRouteHistory('environment', repository)
        useSwapRouteHistoryStore.setState({
            environment: 'environment',
            records: [record('same-id', 10, 'IN_MEMORY')],
        })
        resolveRead([record('same-id', 1, 'PERSISTED'), record('older', 2, 'OTHER')])
        await hydration

        const state = useSwapRouteHistoryStore.getState()
        expect(state.hydratedEnvironment).toBe('environment')
        expect(state.records.find(item => item.swapId === 'same-id')?.sourceRoute?.network).toBe('IN_MEMORY')
        expect(state.records.map(item => item.swapId)).toContain('older')
    })
})
