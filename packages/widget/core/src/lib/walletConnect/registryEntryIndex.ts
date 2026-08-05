import { walletKey } from '@/lib/wallets/utils/walletKey'
import { getInstantiatedAdditionalConnectorsStores, type AdditionalConnectorsSnapshot, } from './additionalConnectorsStore'
import { resolveWalletConnectWallets } from './registry'
import type { WalletConnectWalletBase } from './types'

const LOOKUP_ENTRIES = 10

const resolvedEntries = new Map<string, WalletConnectWalletBase>()
const unresolvedKeys = new Set<string>()
const pendingKeys = new Set<string>()
const listeners = new Set<() => void>()

let version = 0
let cachedIndex: Map<string, WalletConnectWalletBase> | null = null
let cachedFrom: AdditionalConnectorsSnapshot[] = []

const emit = () => {
    version += 1
    listeners.forEach(listener => listener())
}

const getBrowsedEntries = (): Map<string, WalletConnectWalletBase> => {
    const snapshots = getInstantiatedAdditionalConnectorsStores().map(store => store.getSnapshot())
    const unchanged = cachedIndex && snapshots.length === cachedFrom.length && snapshots.every((snapshot, index) => snapshot === cachedFrom[index])
    if (unchanged) return cachedIndex!

    const index = new Map<string, WalletConnectWalletBase>()
    for (const snapshot of snapshots) {
        for (const wallet of snapshot.browseConnectors) {
            const key = walletKey(wallet.name)
            if (key && !index.has(key)) index.set(key, wallet)
        }
    }

    cachedIndex = index
    cachedFrom = snapshots
    return index
}

const resolveProjectId = (): string | undefined =>
    getInstantiatedAdditionalConnectorsStores()[0]?.projectId

const lookupEntry = (key: string, name: string) => {
    pendingKeys.add(key)
    resolveWalletConnectWallets({ search: name, entries: LOOKUP_ENTRIES, projectId: resolveProjectId() })
        .then(({ wallets }) => {
            const match = wallets.find(wallet =>
                walletKey(wallet.name) === key || walletKey(wallet.id) === key)
            if (match) resolvedEntries.set(key, match)
            else unresolvedKeys.add(key)
        })
        .catch(() => { unresolvedKeys.add(key) })
        .finally(() => {
            pendingKeys.delete(key)
            emit()
        })
}

export const getRegistryEntryByName = (name: string): WalletConnectWalletBase | undefined => {
    const key = walletKey(name)
    if (!key) return undefined
    return resolvedEntries.get(key) ?? getBrowsedEntries().get(key)
}

export const requestRegistryEntriesByName = (names: string[]): void => {
    for (const name of names) {
        const key = walletKey(name)
        if (!key) continue
        if (resolvedEntries.has(key) || unresolvedKeys.has(key) || pendingKeys.has(key)) continue
        if (getBrowsedEntries().has(key)) continue
        lookupEntry(key, name)
    }
}

export const hasPendingRegistryEntryLookups = (): boolean => pendingKeys.size > 0

export const subscribeRegistryEntryIndex = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

export const getRegistryEntryIndexVersion = (): number => version