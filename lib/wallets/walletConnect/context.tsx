import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { resolveWalletConnectWallets } from './registry'
import type { WalletConnectWalletBase } from './types'

const PAGE_SIZE = 40

type NamespaceState = {
    connectors: WalletConnectWalletBase[]
    loaded: boolean
    totalCount: number
    hasMore: boolean
    isLoadingMore: boolean
}

const emptyState: NamespaceState = {
    connectors: [],
    loaded: false,
    totalCount: 0,
    hasMore: false,
    isLoadingMore: false,
}

type ContextType = {
    getState: (namespace: string) => NamespaceState
    enable: (namespace: string) => void
    loadForNamespace: (namespace: string) => Promise<WalletConnectWalletBase[]>
    loadMore: (namespace: string) => Promise<void>
    search: (namespace: string, query: string) => Promise<WalletConnectWalletBase[]>
    addRecent: (namespace: string, connector: WalletConnectWalletBase) => void
}

const WalletConnectConnectorsContext = createContext<ContextType | null>(null)

type NamespaceRegistry = {
    connectors: WalletConnectWalletBase[]
    loaded: boolean
    totalCount: number
    hasMore: boolean
    isLoadingMore: boolean
    ensureLoaded: () => Promise<WalletConnectWalletBase[]>
    loadMore: () => Promise<void>
    search: (query: string) => Promise<WalletConnectWalletBase[]>
}

function useNamespaceRegistry(namespace: string, recents: WalletConnectWalletBase[], enabled: boolean): NamespaceRegistry {
    const getKey = (index: number, previous: { nextPage: number | null } | null) => {
        // Skip SWR's mount-time fetch until the namespace is explicitly enabled
        // (wallet modal opened, or a connect-path demands the registry).
        if (!enabled) return null
        if (index === 0) return ['wc-wallets', namespace, 1]
        if (!previous || previous.nextPage == null) return null
        return ['wc-wallets', namespace, previous.nextPage]
    }

    const { data, size, setSize, isValidating, mutate } = useSWRInfinite(
        getKey,
        async ([, ns, page]: [string, string, number]) => resolveWalletConnectWallets({
            namespace: ns,
            page,
            entries: PAGE_SIZE,
        }),
        {
            // Fetch once, then treat cache as fresh for the entire session.
            revalidateFirstPage: false,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            dedupingInterval: 24 * 60 * 60 * 1000,
        },
    )

    const fetched = useMemo(() => data?.flatMap(p => p.wallets) ?? [], [data])

    // Merge recents (prepended, deduplicated) with fetched pages
    const connectors = useMemo(() => {
        if (recents.length === 0) return fetched
        const recentIds = new Set(recents.map(r => r.id.toLowerCase()))
        return [...recents, ...fetched.filter(w => !recentIds.has(w.id.toLowerCase()))]
    }, [recents, fetched])

    const last = data?.[data.length - 1]
    const loaded = !!data && data.length > 0
    // Only report hasMore / isLoadingMore once the first page has resolved —
    // otherwise the UI shows a "loading more" spinner during initial load
    // instead of just rendering whatever it already has.
    const hasMore = loaded && !!last && last.nextPage != null
    const totalCount = last?.totalCount ?? 0
    const isLoadingMore = loaded && isValidating

    // SWR fetches on mount, but a caller (e.g. `connectWallet` after a hard refresh)
    // may race ahead and invoke us before the first page resolves. In that case
    // fetch page 1 directly and prime SWR's cache via `mutate` so the rest of the
    // app (notably `walletConnectConnectors` derived from `data`) updates too.
    // Concurrent callers share a single in-flight request via `inFlightRef`.
    const inFlightRef = useRef<Promise<WalletConnectWalletBase[]> | null>(null)
    const ensureLoaded = useCallback(async (): Promise<WalletConnectWalletBase[]> => {
        if (fetched.length > 0) return fetched
        if (inFlightRef.current) return inFlightRef.current
        const promise = (async () => {
            try {
                const result = await resolveWalletConnectWallets({
                    namespace,
                    page: 1,
                    entries: PAGE_SIZE,
                })
                // Prime SWR's cache without kicking off a redundant revalidation.
                await mutate([result], { revalidate: false })
                return result.wallets
            } finally {
                inFlightRef.current = null
            }
        })()
        inFlightRef.current = promise
        return promise
    }, [fetched, namespace, mutate])

    const loadMore = useCallback(async (): Promise<void> => {
        if (!hasMore || isValidating) return
        await setSize(size + 1)
    }, [hasMore, isValidating, setSize, size])

    const search = useCallback(async (query: string): Promise<WalletConnectWalletBase[]> => {
        const result = await resolveWalletConnectWallets({
            namespace,
            page: 1,
            entries: 100,
            search: query,
        })
        return result.wallets
    }, [namespace])

    return { connectors, loaded, totalCount, hasMore, isLoadingMore, ensureLoaded, loadMore, search }
}

export function WalletConnectConnectorsProvider({ children }) {
    const [recentsByNs, setRecentsByNs] = useState<Record<string, WalletConnectWalletBase[]>>({})
    const [enabledByNs, setEnabledByNs] = useState<Record<string, boolean>>({})

    const evm = useNamespaceRegistry('eip155', recentsByNs['eip155'] ?? [], !!enabledByNs['eip155'])
    const solana = useNamespaceRegistry('solana', recentsByNs['solana'] ?? [], !!enabledByNs['solana'])

    const byNamespace = useMemo<Record<string, NamespaceRegistry>>(() => ({
        eip155: evm,
        solana,
    }), [evm, solana])

    const enable = useCallback((namespace: string): void => {
        setEnabledByNs(prev => prev[namespace] ? prev : { ...prev, [namespace]: true })
    }, [])

    const getState = useCallback((namespace: string): NamespaceState => {
        const reg = byNamespace[namespace]
        if (!reg) return emptyState
        return {
            connectors: reg.connectors,
            loaded: reg.loaded,
            totalCount: reg.totalCount,
            hasMore: reg.hasMore,
            isLoadingMore: reg.isLoadingMore,
        }
    }, [byNamespace])

    const loadForNamespace = useCallback(async (namespace: string): Promise<WalletConnectWalletBase[]> => {
        enable(namespace)
        const reg = byNamespace[namespace]
        if (!reg) return []
        return reg.ensureLoaded()
    }, [byNamespace, enable])

    const loadMore = useCallback(async (namespace: string): Promise<void> => {
        enable(namespace)
        const reg = byNamespace[namespace]
        if (!reg) return
        return reg.loadMore()
    }, [byNamespace, enable])

    const search = useCallback(async (namespace: string, query: string): Promise<WalletConnectWalletBase[]> => {
        // Search issues its own direct request via `resolveWalletConnectWallets`, but we
        // enable here so the SWR registry is warm by the time the user commits to a
        // connect (avoids a fresh cold-start fetch right after the search result click).
        enable(namespace)
        const reg = byNamespace[namespace]
        if (!reg) return []
        return reg.search(query)
    }, [byNamespace, enable])

    const addRecent = useCallback((namespace: string, connector: WalletConnectWalletBase): void => {
        setRecentsByNs(prev => {
            const existing = prev[namespace] ?? []
            const deduped = existing.filter(c => c.name.toLowerCase() !== connector.name.toLowerCase())
            return { ...prev, [namespace]: [connector, ...deduped] }
        })
    }, [])

    const value = useMemo<ContextType>(() => ({
        getState,
        enable,
        loadForNamespace,
        loadMore,
        search,
        addRecent,
    }), [getState, enable, loadForNamespace, loadMore, search, addRecent])

    return (
        <WalletConnectConnectorsContext.Provider value={value}>
            {children}
        </WalletConnectConnectorsContext.Provider>
    )
}

export function useWalletConnectConnectors(namespace: string) {
    const ctx = useContext(WalletConnectConnectorsContext)
    if (!ctx) {
        throw new Error('useWalletConnectConnectors must be used within a WalletConnectConnectorsProvider')
    }
    const { connectors, loaded, totalCount, hasMore, isLoadingMore } = ctx.getState(namespace)
    const enable = useCallback(() => ctx.enable(namespace), [ctx, namespace])
    const load = useCallback(() => ctx.loadForNamespace(namespace), [ctx, namespace])
    const loadMore = useCallback(() => ctx.loadMore(namespace), [ctx, namespace])
    const search = useCallback((query: string) => ctx.search(namespace, query), [ctx, namespace])
    const addRecent = useCallback((connector: WalletConnectWalletBase) => ctx.addRecent(namespace, connector), [ctx, namespace])

    return { connectors, loaded, enable, load, loadMore, search, addRecent, hasMore, isLoadingMore, totalCount }
}
