import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { WalletConnectWalletBase } from './types'

type NamespaceState = {
    connectors: WalletConnectWalletBase[]
    loaded: boolean
}

type ContextType = {
    getState: (namespace: string) => NamespaceState
    loadForNamespace: (namespace: string) => Promise<WalletConnectWalletBase[]>
    addRecent: (namespace: string, connector: WalletConnectWalletBase) => void
}

const WalletConnectConnectorsContext = createContext<ContextType | null>(null)

// Module-level cache so we don't re-filter walletsData.json on every load call.
const registryCache = new Map<string, WalletConnectWalletBase[]>()

const loadRegistry = async (namespace: string): Promise<WalletConnectWalletBase[]> => {
    const cached = registryCache.get(namespace)
    if (cached) return cached

    const registryModule = await import('./registry')
    let resolved: WalletConnectWalletBase[]
    if (namespace === 'eip155') {
        resolved = registryModule.evmWalletConnectWallets
    } else if (namespace === 'solana') {
        resolved = registryModule.solanaWalletConnectWallets
    } else {
        resolved = registryModule.resolveWalletConnectWallets({ namespace })
    }
    registryCache.set(namespace, resolved)
    return resolved
}

export function WalletConnectConnectorsProvider({ children }) {
    const [state, setState] = useState<Record<string, NamespaceState>>({})

    const getState = useCallback((namespace: string): NamespaceState => {
        return state[namespace] ?? { connectors: [], loaded: false }
    }, [state])

    const loadForNamespace = useCallback(async (namespace: string): Promise<WalletConnectWalletBase[]> => {
        const loaded = await loadRegistry(namespace)
        setState((prev) => {
            const existing = prev[namespace]?.connectors ?? []
            const existingIds = new Set(existing.map(c => c.id.toLowerCase()))
            const merged = [
                ...existing,
                ...loaded.filter(w => !existingIds.has(w.id.toLowerCase())),
            ]
            const next = { ...prev, [namespace]: { connectors: merged, loaded: true } }
            return next
        })
        return loaded
    }, [])

    const addRecent = useCallback((namespace: string, connector: WalletConnectWalletBase): void => {
        setState((prev) => {
            const existing = prev[namespace]?.connectors ?? []
            const deduped = existing.filter(c => c.name.toLowerCase() !== connector.name.toLowerCase())
            return {
                ...prev,
                [namespace]: {
                    connectors: [connector, ...deduped],
                    loaded: prev[namespace]?.loaded ?? false,
                },
            }
        })
    }, [])

    const value = useMemo<ContextType>(() => ({
        getState,
        loadForNamespace,
        addRecent,
    }), [getState, loadForNamespace, addRecent])

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
    const { connectors, loaded } = ctx.getState(namespace)
    const load = useCallback(() => ctx.loadForNamespace(namespace), [ctx, namespace])
    const addRecent = useCallback((connector: WalletConnectWalletBase) => ctx.addRecent(namespace, connector), [ctx, namespace])
    return { connectors, loaded, load, addRecent }
}
