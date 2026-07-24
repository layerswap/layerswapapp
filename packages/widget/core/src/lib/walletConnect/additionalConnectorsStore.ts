import { resolveWalletConnectWallets } from './registry'
import type { WalletConnectWalletBase } from './types'
import type { RequestAdditionalConnectorsParams } from '@/types'

type PageCacheEntry = {
    page: number
    pageSize: number
    result: {
        wallets: WalletConnectWalletBase[]
        totalCount: number
        nextPage: number | null
    }
}

type NamespaceCache = Map<string, Map<string, PageCacheEntry>>
export type WalletConnectRequestResult = {
    connectors: WalletConnectWalletBase[]
    nextPage: number | null
    totalCount: number
}

const cacheByNamespace = new Map<string, NamespaceCache>()
const inFlightByKey = new Map<string, Promise<PageCacheEntry['result']>>()

const DEFAULT_PAGE_SIZE = 40
const MAX_CACHED_PAGES_PER_QUERY = 20
const MAX_CACHED_QUERIES_PER_NAMESPACE = 50
const DEFAULT_PROJECT_ID = '6113382c2e587bff00e2b5c3d68531f3'

const normalizeQuery = (query?: string) => query?.trim() ?? ''

const getNamespaceCache = (namespace: string): NamespaceCache => {
    if (!cacheByNamespace.has(namespace)) cacheByNamespace.set(namespace, new Map())
    return cacheByNamespace.get(namespace)!
}

const getQueryCache = (namespace: string, query: string) => {
    const namespaceCache = getNamespaceCache(namespace)
    if (!namespaceCache.has(query)) {
        if (namespaceCache.size >= MAX_CACHED_QUERIES_PER_NAMESPACE) {
            for (const existingKey of namespaceCache.keys()) {
                if (existingKey !== '') {
                    namespaceCache.delete(existingKey)
                    break
                }
            }
        }
        namespaceCache.set(query, new Map())
    }
    return namespaceCache.get(query)!
}

const getPageKey = (page: number, pageSize: number) => `${page}:${pageSize}`

const listCachedPages = (namespace: string, query: string): PageCacheEntry[] =>
    Array.from(getQueryCache(namespace, query).values()).sort((l, r) => l.page - r.page)

const mergeRecents = (recents: WalletConnectWalletBase[], connectors: WalletConnectWalletBase[]) => {
    if (recents.length === 0) return connectors
    const recentIds = new Set(recents.map(c => c.id.toLowerCase()))
    return [...recents, ...connectors.filter(c => !recentIds.has(c.id.toLowerCase()))]
}

async function fetchAdditionalConnectorsPage(
    namespace: string,
    params: Required<RequestAdditionalConnectorsParams & { projectId: string }>,
) {
    const query = normalizeQuery(params.query)
    const pageKey = getPageKey(params.page, params.pageSize)
    const queryCache = getQueryCache(namespace, query)
    const cached = queryCache.get(pageKey)
    if (cached) return cached.result

    const inFlightKey = `${namespace}:${query}:${pageKey}`
    const existingRequest = inFlightByKey.get(inFlightKey)
    if (existingRequest) return existingRequest

    const request = (async () => {
        const result = await resolveWalletConnectWallets({
            namespace,
            page: params.page,
            entries: params.pageSize,
            search: query || undefined,
            projectId: params.projectId,
        })

        if (queryCache.size >= MAX_CACHED_PAGES_PER_QUERY) {
            const oldestKey = queryCache.keys().next().value
            if (oldestKey) queryCache.delete(oldestKey)
        }

        queryCache.set(pageKey, { page: params.page, pageSize: params.pageSize, result })
        return result
    })()

    inFlightByKey.set(inFlightKey, request)
    try {
        return await request
    } finally {
        inFlightByKey.delete(inFlightKey)
    }
}

/**
 * Lifecycle of the initial (page-1, no-query) browse fetch. `idle` means it
 * was never requested; `error` means the last attempt failed and nothing is
 * retrying — a later `ensureBrowseLoaded()` call re-attempts. Once any browse
 * page is cached the status is `ready` regardless of later page failures.
 */
export type RegistryBrowseStatus = 'idle' | 'loading' | 'ready' | 'error'

export type AdditionalConnectorsSnapshot = {
    browseConnectors: readonly WalletConnectWalletBase[]
    browseMetadata: { loaded: boolean; nextPage: number | null; totalCount: number; status: RegistryBrowseStatus }
}

export type AdditionalConnectorsStore = {
    subscribe(listener: () => void): () => void
    getSnapshot(): AdditionalConnectorsSnapshot
    requestAdditionalConnectors(
        params?: RequestAdditionalConnectorsParams,
    ): Promise<WalletConnectRequestResult>
    /**
     * Triggers the page-1 browse fetch if it hasn't succeeded yet. Never
     * rejects and dedupes concurrent calls, so it is safe to fire on every
     * hover/modal-open/settle-check; after a failure the next call retries.
     */
    ensureBrowseLoaded(): Promise<void>
    addRecentConnector(connector: WalletConnectWalletBase): void
}

type InternalState = {
    recents: WalletConnectWalletBase[]
    browseVersion: number
    browseStatus: RegistryBrowseStatus
}

const EMPTY_SNAPSHOT: AdditionalConnectorsSnapshot = Object.freeze({
    browseConnectors: Object.freeze([]) as readonly WalletConnectWalletBase[],
    browseMetadata: Object.freeze({ loaded: false, nextPage: null, totalCount: 0, status: 'idle' as RegistryBrowseStatus }),
})

function createStore(namespace: string, projectId: string): AdditionalConnectorsStore {
    let state: InternalState = { recents: [], browseVersion: 0, browseStatus: 'idle' }
    let snapshot: AdditionalConnectorsSnapshot = EMPTY_SNAPSHOT
    let ensureInFlight: Promise<void> | null = null
    const listeners = new Set<() => void>()

    // Snapshot inputs behind the last emit. Downstream connection snapshots
    // (EVM/SVM) compare `browseConnectors` by identity, so rebuilding the
    // array when neither the cached pages nor the recents changed would
    // falsely invalidate their memoization.
    let lastPages: readonly PageCacheEntry[] = []
    let lastRecents: readonly WalletConnectWalletBase[] = state.recents
    let lastStatus: RegistryBrowseStatus = 'idle'

    const computeSnapshot = (): AdditionalConnectorsSnapshot => {
        const cachedBrowsePages = listCachedPages(namespace, '')
        // Cached pages are the source of truth: another store instance sharing
        // this namespace cache may have loaded them, so `ready` wins over
        // whatever this instance's own fetch lifecycle says.
        const status: RegistryBrowseStatus = cachedBrowsePages.length > 0 ? 'ready' : state.browseStatus
        const pagesUnchanged = cachedBrowsePages.length === lastPages.length
            && cachedBrowsePages.every((page, i) => page === lastPages[i])
        if (pagesUnchanged && state.recents === lastRecents && status === lastStatus) return snapshot
        lastPages = cachedBrowsePages
        lastRecents = state.recents
        lastStatus = status
        const connectors = cachedBrowsePages.flatMap(page => page.result.wallets)
        const browseConnectors = mergeRecents(state.recents, connectors)
        const lastPage = cachedBrowsePages[cachedBrowsePages.length - 1]
        return {
            browseConnectors,
            browseMetadata: {
                loaded: cachedBrowsePages.length > 0,
                nextPage: lastPage?.result.nextPage ?? null,
                totalCount: lastPage?.result.totalCount ?? 0,
                status,
            },
        }
    }

    const emit = () => {
        const next = computeSnapshot()
        if (next === snapshot) return
        snapshot = next
        listeners.forEach(l => l())
        notifyStoresListeners()
    }

    snapshot = computeSnapshot()

    const requestAdditionalConnectors = async (params: RequestAdditionalConnectorsParams = {}) => {
        const normalized = {
            page: params.page ?? 1,
            pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
            query: normalizeQuery(params.query),
            projectId,
        }
        const isBrowse = !normalized.query
        if (isBrowse && !snapshot.browseMetadata.loaded && state.browseStatus !== 'loading') {
            state = { ...state, browseStatus: 'loading' }
            emit()
        }
        try {
            const result = await fetchAdditionalConnectorsPage(namespace, normalized)
            if (isBrowse) {
                state = { ...state, browseVersion: state.browseVersion + 1, browseStatus: 'ready' }
                emit()
            }
            return {
                connectors: result.wallets,
                nextPage: result.nextPage,
                totalCount: result.totalCount,
            }
        } catch (error) {
            if (isBrowse && !snapshot.browseMetadata.loaded) {
                state = { ...state, browseStatus: 'error' }
                emit()
            }
            throw error
        }
    }

    return {
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        getSnapshot() {
            return snapshot
        },
        requestAdditionalConnectors,
        async ensureBrowseLoaded() {
            if (snapshot.browseMetadata.loaded) return
            if (ensureInFlight) return ensureInFlight
            ensureInFlight = (async () => {
                try {
                    await requestAdditionalConnectors({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
                } catch (error) {
                    console.warn(`Failed to load WalletConnect wallets registry (${namespace})`, error)
                } finally {
                    ensureInFlight = null
                }
            })()
            return ensureInFlight
        },
        addRecentConnector(connector) {
            const deduped = state.recents.filter(
                item => item.id.toLowerCase() !== connector.id.toLowerCase(),
            )
            state = { ...state, recents: [connector, ...deduped] }
            emit()
        },
    }
}

const storeRegistry = new Map<string, AdditionalConnectorsStore>()

// Cross-store listeners: fired when any namespace store emits or a new store
// is instantiated (a lazily-hydrated wallet package creating its store must
// wake widget-side readiness checks that enumerate instantiated stores).
const storesListeners = new Set<() => void>()
const notifyStoresListeners = () => {
    storesListeners.forEach(l => l())
}

export function subscribeAdditionalConnectorsStores(listener: () => void): () => void {
    storesListeners.add(listener)
    return () => { storesListeners.delete(listener) }
}

export function getInstantiatedAdditionalConnectorsStores(): AdditionalConnectorsStore[] {
    return Array.from(storeRegistry.values())
}

/**
 * Fire-and-forget warm-up of the page-1 browse fetch for every namespace
 * store that exists so far. Also serves as the retry path after an `error`
 * status — `ensureBrowseLoaded` re-attempts failed fetches.
 */
export function ensureRegistryBrowseLoaded(): void {
    for (const store of storeRegistry.values()) void store.ensureBrowseLoaded()
}

export function getAdditionalConnectorsStore(
    namespace: string,
    projectId?: string,
): AdditionalConnectorsStore {
    const resolvedProjectId = projectId ?? DEFAULT_PROJECT_ID
    const key = `${namespace}:${resolvedProjectId}`
    let store = storeRegistry.get(key)
    if (!store) {
        store = createStore(namespace, resolvedProjectId)
        storeRegistry.set(key, store)
        notifyStoresListeners()
    }
    return store
}
