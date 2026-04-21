import { useCallback, useMemo, useState } from 'react'
import type { RequestAdditionalConnectorsParams } from '@/Models/WalletProvider'
import { resolveWalletConnectWallets } from './registry'
import type { WalletConnectWalletBase } from './types'

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
type WalletConnectRequestResult = {
    connectors: WalletConnectWalletBase[]
    nextPage: number | null
    totalCount: number
}

const cacheByNamespace = new Map<string, NamespaceCache>()
const inFlightByKey = new Map<string, Promise<PageCacheEntry['result']>>()

const DEFAULT_PAGE_SIZE = 40
const MAX_CACHED_PAGES_PER_QUERY = 20
const MAX_CACHED_QUERIES_PER_NAMESPACE = 50

const normalizeQuery = (query?: string) => query?.trim() ?? ''

const getNamespaceCache = (namespace: string): NamespaceCache => {
    if (!cacheByNamespace.has(namespace)) {
        cacheByNamespace.set(namespace, new Map())
    }

    return cacheByNamespace.get(namespace)!
}

const getQueryCache = (namespace: string, query: string) => {
    const namespaceCache = getNamespaceCache(namespace)
    if (!namespaceCache.has(query)) {
        if (namespaceCache.size >= MAX_CACHED_QUERIES_PER_NAMESPACE) {
            // Evict the oldest non-browse entry (Map iteration is insertion order).
            // The browse key ('') backs the default list and stays cached to avoid
            // a blank wallet list when the user clears their search.
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

const listCachedPages = (namespace: string, query: string): PageCacheEntry[] => {
    return Array.from(getQueryCache(namespace, query).values())
        .sort((left, right) => left.page - right.page)
}

const mergeRecents = (recents: WalletConnectWalletBase[], connectors: WalletConnectWalletBase[]) => {
    if (recents.length === 0) return connectors

    const recentIds = new Set(recents.map(connector => connector.id.toLowerCase()))
    return [...recents, ...connectors.filter(connector => !recentIds.has(connector.id.toLowerCase()))]
}

async function fetchAdditionalConnectorsPage(namespace: string, params: Required<RequestAdditionalConnectorsParams>) {
    const query = normalizeQuery(params.query)
    const pageKey = getPageKey(params.page, params.pageSize)
    const queryCache = getQueryCache(namespace, query)
    const cached = queryCache.get(pageKey)

    if (cached) {
        return cached.result
    }

    const inFlightKey = `${namespace}:${query}:${pageKey}`
    const existingRequest = inFlightByKey.get(inFlightKey)

    if (existingRequest) {
        return existingRequest
    }

    const request = (async () => {
        const result = await resolveWalletConnectWallets({
            namespace,
            page: params.page,
            entries: params.pageSize,
            search: query || undefined,
        })

        if (queryCache.size >= MAX_CACHED_PAGES_PER_QUERY) {
            const oldestKey = queryCache.keys().next().value
            if (oldestKey) queryCache.delete(oldestKey)
        }

        queryCache.set(pageKey, {
            page: params.page,
            pageSize: params.pageSize,
            result,
        })

        return result
    })()

    inFlightByKey.set(inFlightKey, request)

    try {
        return await request
    } finally {
        inFlightByKey.delete(inFlightKey)
    }
}

export function useAdditionalConnectors(namespace: string) {
    const [recents, setRecents] = useState<WalletConnectWalletBase[]>([])
    const [browseVersion, setBrowseVersion] = useState(0)

    const requestAdditionalConnectors = useCallback(async (params: RequestAdditionalConnectorsParams = {}): Promise<WalletConnectRequestResult> => {
        const normalizedParams = {
            page: params.page ?? 1,
            pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
            query: normalizeQuery(params.query),
        }

        const result = await fetchAdditionalConnectorsPage(namespace, normalizedParams)

        if (!normalizedParams.query) {
            setBrowseVersion(version => version + 1)
        }

        return {
            connectors: result.wallets,
            nextPage: result.nextPage,
            totalCount: result.totalCount,
        }
    }, [namespace])

    const addRecentConnector = useCallback((connector: WalletConnectWalletBase) => {
        setRecents(previous => {
            const deduped = previous.filter(item => item.id.toLowerCase() !== connector.id.toLowerCase())
            return [connector, ...deduped]
        })
    }, [])

    const cachedBrowsePages = useMemo(() => listCachedPages(namespace, ''), [namespace, browseVersion])

    const browseConnectors = useMemo(() => {
        const connectors = cachedBrowsePages.flatMap(page => page.result.wallets)
        return mergeRecents(recents, connectors)
    }, [cachedBrowsePages, recents])

    const browseMetadata = useMemo(() => {
        const lastPage = cachedBrowsePages[cachedBrowsePages.length - 1]
        return {
            loaded: cachedBrowsePages.length > 0,
            nextPage: lastPage?.result.nextPage ?? null,
            totalCount: lastPage?.result.totalCount ?? 0,
        }
    }, [cachedBrowsePages])

    return {
        browseConnectors,
        browseMetadata,
        requestAdditionalConnectors,
        addRecentConnector,
    }
}
