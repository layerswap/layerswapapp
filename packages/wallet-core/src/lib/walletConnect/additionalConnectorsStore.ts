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

export type AdditionalConnectorsSnapshot = {
    browseConnectors: readonly WalletConnectWalletBase[]
    browseMetadata: { loaded: boolean; nextPage: number | null; totalCount: number }
}

export type AdditionalConnectorsStore = {
    subscribe(listener: () => void): () => void
    getSnapshot(): AdditionalConnectorsSnapshot
    requestAdditionalConnectors(
        params?: RequestAdditionalConnectorsParams,
    ): Promise<WalletConnectRequestResult>
    addRecentConnector(connector: WalletConnectWalletBase): void
}

type InternalState = {
    recents: WalletConnectWalletBase[]
    browseVersion: number
}

const EMPTY_SNAPSHOT: AdditionalConnectorsSnapshot = Object.freeze({
    browseConnectors: Object.freeze([]) as readonly WalletConnectWalletBase[],
    browseMetadata: Object.freeze({ loaded: false, nextPage: null, totalCount: 0 }),
})

function createStore(namespace: string, projectId: string): AdditionalConnectorsStore {
    let state: InternalState = { recents: [], browseVersion: 0 }
    let snapshot: AdditionalConnectorsSnapshot = EMPTY_SNAPSHOT
    const listeners = new Set<() => void>()

    const computeSnapshot = (): AdditionalConnectorsSnapshot => {
        const cachedBrowsePages = listCachedPages(namespace, '')
        const connectors = cachedBrowsePages.flatMap(page => page.result.wallets)
        const browseConnectors = mergeRecents(state.recents, connectors)
        const lastPage = cachedBrowsePages[cachedBrowsePages.length - 1]
        return {
            browseConnectors,
            browseMetadata: {
                loaded: cachedBrowsePages.length > 0,
                nextPage: lastPage?.result.nextPage ?? null,
                totalCount: lastPage?.result.totalCount ?? 0,
            },
        }
    }

    const emit = () => {
        snapshot = computeSnapshot()
        listeners.forEach(l => l())
    }

    snapshot = computeSnapshot()

    return {
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        getSnapshot() {
            return snapshot
        },
        async requestAdditionalConnectors(params: RequestAdditionalConnectorsParams = {}) {
            const normalized = {
                page: params.page ?? 1,
                pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
                query: normalizeQuery(params.query),
                projectId,
            }
            const result = await fetchAdditionalConnectorsPage(namespace, normalized)
            if (!normalized.query) {
                state = { ...state, browseVersion: state.browseVersion + 1 }
                emit()
            }
            return {
                connectors: result.wallets,
                nextPage: result.nextPage,
                totalCount: result.totalCount,
            }
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
    }
    return store
}
