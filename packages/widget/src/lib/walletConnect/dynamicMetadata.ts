import type { DynamicWcMetadata } from "./types"

const STORAGE_KEY = 'ls_walletconnect_dynamic_metadata'

type Store = Record<string, Record<string, DynamicWcMetadata>>

// In-memory store for metadata captured BEFORE the wallet address is known
// (e.g. between user click and the WC session completing). Keyed by namespace.
const pendingStore = new Map<string, DynamicWcMetadata>()

// Cache the parsed localStorage payload so repeated reads from render paths
// (useMemo in useEVM / useSVM) don't hit localStorage synchronously every time.
let _storeCache: Store | null = null

const readStore = (): Store => {
    if (_storeCache !== null) return _storeCache
    if (typeof window === 'undefined') return {}
    ensureStorageListener()
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        _storeCache = stored ? JSON.parse(stored) : {}
    } catch {
        _storeCache = {}
    }
    return _storeCache as Store
}

const writeStore = (store: Store): void => {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
        _storeCache = store
    } catch {
        // ignore quota / serialization errors
    }
}

// Cross-tab invalidation: another tab writing to our key must bust this tab's cache.
// Lazily registered on first read/write so we never touch `window` at import time (SSR-safe).
let _storageListenerRegistered = false
const ensureStorageListener = () => {
    if (_storageListenerRegistered || typeof window === 'undefined') return
    _storageListenerRegistered = true
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY || e.key === null) _storeCache = null
    })
}

const normalizeAddress = (namespace: string, address: string): string => {
    // EVM addresses are case-insensitive; Solana base58 keys are case-sensitive.
    return namespace === 'eip155' ? address.toLowerCase() : address
}

export const getDynamicWcMetadata = (namespace: string, address: string): DynamicWcMetadata | null => {
    const store = readStore()
    const key = normalizeAddress(namespace, address)
    return store[namespace]?.[key] ?? null
}

export const setDynamicWcMetadata = (
    namespace: string,
    address: string,
    meta: DynamicWcMetadata,
): void => {
    const store = readStore()
    const key = normalizeAddress(namespace, address)
    const ns = store[namespace] ?? {}
    ns[key] = meta
    store[namespace] = ns
    writeStore(store)
}

export const setPendingDynamicWcMetadata = (namespace: string, meta: DynamicWcMetadata | null): void => {
    if (meta === null) {
        pendingStore.delete(namespace)
    } else {
        pendingStore.set(namespace, meta)
    }
}

export const getPendingDynamicWcMetadata = (namespace: string): DynamicWcMetadata | null => {
    return pendingStore.get(namespace) ?? null
}

export const clearPendingDynamicWcMetadata = (namespace: string): void => {
    pendingStore.delete(namespace)
}

/**
 * Convenience helper used by both EVM and Solana connect flows to set/clear
 * pending metadata from a registry entry in a single call.
 */
export const setPendingMetadataForRegistry = (
    namespace: string,
    registry: { name: string; icon?: string; id: string } | undefined
): DynamicWcMetadata | undefined => {
    if (!registry) {
        clearPendingDynamicWcMetadata(namespace)
        return undefined
    }
    const meta: DynamicWcMetadata = {
        name: registry.name,
        icon: registry.icon || '',
        id: registry.id,
    }
    setPendingDynamicWcMetadata(namespace, meta)
    return meta
}
