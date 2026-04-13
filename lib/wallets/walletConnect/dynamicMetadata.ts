import type { DynamicWcMetadata } from "./types"

const STORAGE_KEY = 'ls_walletconnect_dynamic_metadata'

type Store = Record<string, Record<string, DynamicWcMetadata>>

// In-memory store for metadata captured BEFORE the wallet address is known
// (e.g. between user click and the WC session completing). Keyed by namespace.
const pendingStore = new Map<string, DynamicWcMetadata>()

const readStore = (): Store => {
    if (typeof window === 'undefined') return {}
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : {}
    } catch {
        return {}
    }
}

const writeStore = (store: Store): void => {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch {
        // ignore quota / serialization errors
    }
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
