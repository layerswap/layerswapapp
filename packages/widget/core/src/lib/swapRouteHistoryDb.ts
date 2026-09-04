export type SwapRouteIdentity = {
    network: string;
    token: string;
}

export type PersistedSwapRoute = {
    swapId: string;
    environment: string;
    createdAt: number;
    sourceRoute?: SwapRouteIdentity;
    destinationRoute: SwapRouteIdentity;
}

const DATABASE_NAME = 'layerswap-widget-swap-history'
const DATABASE_VERSION = 1
const STORE_NAME = 'swap-route-history'
const ENVIRONMENT_INDEX = 'environment'

export const MAX_PERSISTED_SWAP_ROUTES = 500

type RepositoryOptions = {
    indexedDb?: IDBFactory;
    databaseName?: string;
}

export type SwapRouteHistoryRepository = {
    getRecent: (environment: string) => Promise<PersistedSwapRoute[]>;
    upsert: (records: PersistedSwapRoute[]) => Promise<void>;
    close: () => void;
}

/**
 * Small native IndexedDB repository. All failures are deliberately contained:
 * route history improves suggestions, but must never prevent the widget from
 * rendering or creating a swap.
 */
export function createSwapRouteHistoryRepository(options: RepositoryOptions = {}): SwapRouteHistoryRepository {
    const indexedDb = options.indexedDb ?? (typeof indexedDB === 'undefined' ? undefined : indexedDB)
    const databaseName = options.databaseName ?? DATABASE_NAME
    let databasePromise: Promise<IDBDatabase | null> | undefined
    let database: IDBDatabase | undefined

    const openDatabase = () => {
        if (!indexedDb) return Promise.resolve(null)
        if (databasePromise) return databasePromise

        databasePromise = new Promise<IDBDatabase | null>((resolve) => {
            let settled = false
            const request = indexedDb.open(databaseName, DATABASE_VERSION)

            request.onupgradeneeded = () => {
                const db = request.result
                if (db.objectStoreNames.contains(STORE_NAME)) return
                const store = db.createObjectStore(STORE_NAME, { keyPath: ['environment', 'swapId'] })
                store.createIndex(ENVIRONMENT_INDEX, 'environment', { unique: false })
            }
            request.onsuccess = () => {
                if (settled) {
                    request.result.close()
                    return
                }
                settled = true
                database = request.result
                database.onversionchange = () => {
                    database?.close()
                    database = undefined
                    databasePromise = undefined
                }
                resolve(database)
            }
            request.onerror = () => {
                if (settled) return
                settled = true
                resolve(null)
            }
            request.onblocked = () => {
                if (settled) return
                settled = true
                resolve(null)
            }
        })

        return databasePromise
    }

    const getRecent = async (environment: string): Promise<PersistedSwapRoute[]> => {
        try {
            const db = await openDatabase()
            if (!db) return []

            const transaction = db.transaction(STORE_NAME, 'readonly')
            const records = await requestAsPromise<PersistedSwapRoute[]>(
                transaction.objectStore(STORE_NAME).index(ENVIRONMENT_INDEX).getAll(environment),
            )
            await transactionDone(transaction)

            return records
                .sort(compareNewestFirst)
                .slice(0, MAX_PERSISTED_SWAP_ROUTES)
        } catch {
            return []
        }
    }

    const upsert = async (records: PersistedSwapRoute[]): Promise<void> => {
        if (records.length === 0) return

        try {
            const db = await openDatabase()
            if (!db) return

            const transaction = db.transaction(STORE_NAME, 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            for (const record of records) store.put(record)
            await transactionDone(transaction)

            const environments = new Set(records.map(record => record.environment))
            await Promise.all([...environments].map(environment => pruneEnvironment(db, environment)))
        } catch {
            // Suggestion history is best-effort. Keep the in-memory state usable.
        }
    }

    const close = () => {
        database?.close()
        database = undefined
        databasePromise = undefined
    }

    return { getRecent, upsert, close }
}

async function pruneEnvironment(db: IDBDatabase, environment: string) {
    const readTransaction = db.transaction(STORE_NAME, 'readonly')
    const records = await requestAsPromise<PersistedSwapRoute[]>(
        readTransaction.objectStore(STORE_NAME).index(ENVIRONMENT_INDEX).getAll(environment),
    )
    await transactionDone(readTransaction)

    if (records.length <= MAX_PERSISTED_SWAP_ROUTES) return

    const staleRecords = records
        .sort(compareNewestFirst)
        .slice(MAX_PERSISTED_SWAP_ROUTES)
    const deleteTransaction = db.transaction(STORE_NAME, 'readwrite')
    const store = deleteTransaction.objectStore(STORE_NAME)
    for (const record of staleRecords) store.delete([environment, record.swapId])
    await transactionDone(deleteTransaction)
}

function compareNewestFirst(a: PersistedSwapRoute, b: PersistedSwapRoute) {
    return b.createdAt - a.createdAt || a.swapId.localeCompare(b.swapId)
}

function requestAsPromise<T>(request: IDBRequest<T>) {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

function transactionDone(transaction: IDBTransaction) {
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
    })
}

export const swapRouteHistoryRepository = createSwapRouteHistoryRepository()
