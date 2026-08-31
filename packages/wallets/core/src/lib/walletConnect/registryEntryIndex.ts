import { walletKey } from '@/lib/walletKey'
import { chainsForNamespace } from './api'
import { getInstantiatedAdditionalConnectorsStores, subscribeAdditionalConnectorsStores, type AdditionalConnectorsStore } from './additionalConnectorsStore'
import { resolveWalletConnectWallets } from './registry'
import type { WalletConnectWalletBase } from './types'

const LOOKUP_ENTRIES = 10
const ERROR_RETRY_DELAY_MS = 30_000
const REGISTRY_CHAIN_IDS = ['eip155', 'solana'].flatMap(namespace => chainsForNamespace(namespace).split(',').filter(Boolean))

const resolvedEntries = new Map<string, WalletConnectWalletBase | null>()
const failedAt = new Map<string, number>()
const pending = new Set<string>()
const listeners = new Set<() => void>()

let version = 0
let cachedIndex: Map<string, WalletConnectWalletBase> | null = null

const emit = () => {
    version += 1
    listeners.forEach(listener => listener())
}

subscribeAdditionalConnectorsStores(() => {
    cachedIndex = null
    emit()
})

const getBrowsedEntries = (): Map<string, WalletConnectWalletBase> => {
    if (cachedIndex) return cachedIndex
    const index = new Map<string, WalletConnectWalletBase>()
    for (const store of getInstantiatedAdditionalConnectorsStores()) {
        for (const wallet of store.getSnapshot().browseConnectors) {
            for (const value of [wallet.name, wallet.id]) {
                const key = walletKey(value)
                if (key && !index.has(key)) index.set(key, wallet)
            }
        }
    }
    cachedIndex = index
    return index
}

const getReadyStore = (): AdditionalConnectorsStore | undefined => getInstantiatedAdditionalConnectorsStores().find(store => store.getSnapshot().browseMetadata.status === 'ready')

const findExactMatch = (key: string, wallets: readonly WalletConnectWalletBase[]): WalletConnectWalletBase | undefined => wallets.find(wallet => walletKey(wallet.name) === key || walletKey(wallet.id) === key)
const isFailureBackoff = (key: string) => Date.now() - (failedAt.get(key) ?? -Infinity) < ERROR_RETRY_DELAY_MS

export const getRegistryEntryByName = (name: string): WalletConnectWalletBase | undefined => {
    const key = walletKey(name)
    if (!key) return undefined
    return resolvedEntries.get(key) ?? getBrowsedEntries().get(key)
}

const resolveRegistryEntryByName = async (name: string): Promise<void> => {
    const key = walletKey(name)
    if (!key) return

    await Promise.all(getInstantiatedAdditionalConnectorsStores().map(store => store.ensureBrowseLoaded()))

    if (resolvedEntries.has(key) || pending.has(key) || isFailureBackoff(key)) return

    const store = getReadyStore()
    if (!store) return

    pending.add(key)
    try {
        const { wallets } = await resolveWalletConnectWallets({ chainIds: REGISTRY_CHAIN_IDS, search: name, entries: LOOKUP_ENTRIES, projectId: store.projectId, persistCache: true })
        const match = findExactMatch(key, wallets)
        resolvedEntries.set(key, match ?? null)
        if (match) emit()
    } catch {
        failedAt.set(key, Date.now())
    } finally {
        pending.delete(key)
    }
}

export const requestRegistryEntriesByName = (names: readonly string[]): void => {
    if (!getReadyStore()) return
    for (const name of names) void resolveRegistryEntryByName(name)
}

export const subscribeRegistryEntryIndex = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

export const getRegistryEntryIndexVersion = (): number => version
