import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { WalletConnectWalletBase } from './types'

type NamespaceState = {
    connectors: WalletConnectWalletBase[]
    loaded: boolean
    totalCount: number
    nextPage: number | null
    isLoadingMore: boolean
}

const emptyState: NamespaceState = {
    connectors: [],
    loaded: false,
    totalCount: 0,
    nextPage: null,
    isLoadingMore: false,
}

type ContextType = {
    getState: (namespace: string) => NamespaceState
    loadForNamespace: (namespace: string) => Promise<WalletConnectWalletBase[]>
    loadMore: (namespace: string) => Promise<void>
    search: (namespace: string, query: string) => Promise<WalletConnectWalletBase[]>
    addRecent: (namespace: string, connector: WalletConnectWalletBase) => void
}

const WalletConnectConnectorsContext = createContext<ContextType | null>(null)

export function WalletConnectConnectorsProvider({ children }) {
    const [state, setState] = useState<Record<string, NamespaceState>>({})
    const stateRef = useRef(state)
    stateRef.current = state

    const getState = useCallback((namespace: string): NamespaceState => {
        return state[namespace] ?? emptyState
    }, [state])

    const mergeResult = useCallback((namespace: string, result: { wallets: WalletConnectWalletBase[]; totalCount: number; nextPage: number | null }) => {
        setState(prev => {
            const existing = prev[namespace]?.connectors ?? []
            const existingIds = new Set(existing.map(c => c.id.toLowerCase()))
            const merged = [
                ...existing,
                ...result.wallets.filter(w => !existingIds.has(w.id.toLowerCase())),
            ]
            return {
                ...prev,
                [namespace]: {
                    connectors: merged,
                    loaded: true,
                    totalCount: result.totalCount,
                    nextPage: result.nextPage,
                    isLoadingMore: false,
                },
            }
        })
    }, [])

    const loadForNamespace = useCallback(async (namespace: string): Promise<WalletConnectWalletBase[]> => {
        const { resolveWalletConnectWallets } = await import('./registry')
        const result = await resolveWalletConnectWallets({ namespace, page: 1, entries: 40 })
        mergeResult(namespace, result)
        return result.wallets
    }, [mergeResult])

    const loadMore = useCallback(async (namespace: string): Promise<void> => {
        const current = stateRef.current[namespace]
        if (!current?.nextPage || current.isLoadingMore) return

        setState(prev => ({
            ...prev,
            [namespace]: { ...prev[namespace], isLoadingMore: true },
        }))

        try {
            const { resolveWalletConnectWallets } = await import('./registry')
            const result = await resolveWalletConnectWallets({
                namespace,
                page: current.nextPage,
                entries: 40,
            })
            mergeResult(namespace, result)
        } catch {
            setState(prev => ({
                ...prev,
                [namespace]: { ...prev[namespace], isLoadingMore: false },
            }))
        }
    }, [mergeResult])

    const search = useCallback(async (namespace: string, query: string): Promise<WalletConnectWalletBase[]> => {
        const { resolveWalletConnectWallets } = await import('./registry')
        const result = await resolveWalletConnectWallets({
            namespace,
            page: 1,
            entries: 100,
            search: query,
        })
        return result.wallets
    }, [])

    const addRecent = useCallback((namespace: string, connector: WalletConnectWalletBase): void => {
        setState((prev) => {
            const existing = prev[namespace]?.connectors ?? []
            const deduped = existing.filter(c => c.name.toLowerCase() !== connector.name.toLowerCase())
            return {
                ...prev,
                [namespace]: {
                    ...prev[namespace] ?? emptyState,
                    connectors: [connector, ...deduped],
                },
            }
        })
    }, [])

    const value = useMemo<ContextType>(() => ({
        getState,
        loadForNamespace,
        loadMore,
        search,
        addRecent,
    }), [getState, loadForNamespace, loadMore, search, addRecent])

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
    const { connectors, loaded, totalCount, nextPage, isLoadingMore } = ctx.getState(namespace)
    const load = useCallback(() => ctx.loadForNamespace(namespace), [ctx, namespace])
    const loadMoreWallets = useCallback(() => ctx.loadMore(namespace), [ctx, namespace])
    const searchWallets = useCallback((query: string) => ctx.search(namespace, query), [ctx, namespace])
    const addRecent = useCallback((connector: WalletConnectWalletBase) => ctx.addRecent(namespace, connector), [ctx, namespace])
    const hasMore = nextPage != null

    return { connectors, loaded, load, loadMore: loadMoreWallets, search: searchWallets, addRecent, hasMore, isLoadingMore, totalCount }
}
