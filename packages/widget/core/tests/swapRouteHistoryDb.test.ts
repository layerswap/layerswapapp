import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import {
    MAX_PERSISTED_SWAP_ROUTES,
    createSwapRouteHistoryRepository,
    type PersistedSwapRoute,
} from '@/lib/swapRouteHistoryDb'

const route = { network: 'NETWORK', token: 'TOKEN' }

function record(swapId: string, environment: string, createdAt: number): PersistedSwapRoute {
    return {
        swapId,
        environment,
        createdAt,
        sourceRoute: route,
        destinationRoute: route,
    }
}

describe('swap route history IndexedDB repository', () => {
    it('upserts by environment and swap id while keeping environments isolated', async () => {
        const repository = createSwapRouteHistoryRepository({
            indexedDb: new IDBFactory(),
            databaseName: 'swap-history-upsert',
        })

        await repository.upsert([
            record('same-id', 'mainnet', 1),
            record('testnet-id', 'testnet', 2),
        ])
        await repository.upsert([record('same-id', 'mainnet', 3)])

        expect(await repository.getRecent('mainnet')).toEqual([record('same-id', 'mainnet', 3)])
        expect(await repository.getRecent('testnet')).toEqual([record('testnet-id', 'testnet', 2)])
        repository.close()
    })

    it('retains only the newest 500 records for an environment', async () => {
        const repository = createSwapRouteHistoryRepository({
            indexedDb: new IDBFactory(),
            databaseName: 'swap-history-retention',
        })
        const records = Array.from(
            { length: MAX_PERSISTED_SWAP_ROUTES + 5 },
            (_, index) => record(`swap-${index}`, 'mainnet', index),
        )

        await repository.upsert(records)

        const persisted = await repository.getRecent('mainnet')
        expect(persisted).toHaveLength(MAX_PERSISTED_SWAP_ROUTES)
        expect(persisted[0].createdAt).toBe(MAX_PERSISTED_SWAP_ROUTES + 4)
        expect(persisted.at(-1)?.createdAt).toBe(5)
        repository.close()
    })

    it('falls back to an empty no-op repository when IndexedDB is unavailable', async () => {
        const repository = createSwapRouteHistoryRepository({ databaseName: 'unavailable' })

        await expect(repository.upsert([record('swap', 'mainnet', 1)])).resolves.toBeUndefined()
        await expect(repository.getRecent('mainnet')).resolves.toEqual([])
    })
})
