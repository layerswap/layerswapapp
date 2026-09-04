import { walletKey } from '@/lib/walletKey'
import type { Web3ModalWallet } from './api'
import { getInstantiatedAdditionalConnectorsStores, subscribeAdditionalConnectorsStores, type AdditionalConnectorsStore } from './additionalConnectorsStore'
import { mapWallet } from './mapWallet'
import { SLUGS_TO_FILTER } from '@/constants'
import { WALLET_REGISTRY_BATCH_LIMIT, type WalletRegistryBatchResponse } from './registrySnapshot'
import type { WalletConnectWalletBase } from './types'

const WALLET_REGISTRY_URL = 'https://layerswap.io/app/api/wallet-registry'
const ERROR_RETRY_DELAY_MS = 30_000

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

const isFailureBackoff = (key: string) => Date.now() - (failedAt.get(key) ?? -Infinity) < ERROR_RETRY_DELAY_MS

export const getRegistryEntryByName = (name: string): WalletConnectWalletBase | undefined => {
    const key = walletKey(name)
    if (!key) return undefined
    return resolvedEntries.get(key) ?? getBrowsedEntries().get(key)
}

const postRegistryBatch = async (names: string[], projectId: string): Promise<Web3ModalWallet[]> => {
    const res = await fetch(WALLET_REGISTRY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ names, projectId }),
    })
    if (!res.ok) throw new Error(`wallet-registry failed: ${res.status}`)
    const data = await res.json() as WalletRegistryBatchResponse
    if (!Array.isArray(data?.wallets)) throw new Error('wallet-registry: invalid response')
    return data.wallets
}

const resolveRegistryEntries = async (requested: Map<string, string>): Promise<void> => {
    for (const key of requested.keys()) pending.add(key)
    try {
        await Promise.all(getInstantiatedAdditionalConnectorsStores().map(store => store.ensureBrowseLoaded()))
        const store = getReadyStore()
        if (!store) return

        const batch = [...requested].filter(([key]) => !resolvedEntries.has(key) && !getBrowsedEntries().has(key)).slice(0, WALLET_REGISTRY_BATCH_LIMIT)
        if (!batch.length) return

        const wallets = await postRegistryBatch(batch.map(([, name]) => name), store.projectId)
        const index = new Map<string, WalletConnectWalletBase>(wallets.flatMap((raw): [string, WalletConnectWalletBase][] => {
            const mapped = mapWallet(raw, store.projectId)
            if (SLUGS_TO_FILTER.includes(mapped.id)) return []
            return [[walletKey(mapped.name), mapped], [walletKey(mapped.id), mapped]]
        }))

        let matched = false
        for (const [key] of batch) {
            const match = index.get(key) ?? null
            resolvedEntries.set(key, match)
            matched ||= !!match
        }
        if (matched) emit()
    } catch {
        for (const key of requested.keys()) failedAt.set(key, Date.now())
    } finally {
        for (const key of requested.keys()) pending.delete(key)
    }
}

export const requestRegistryEntriesByName = (names: readonly string[]): void => {
    if (!getReadyStore()) return
    const batch = new Map<string, string>()
    for (const name of names) {
        const key = walletKey(name)
        if (!key || batch.has(key) || resolvedEntries.has(key) || pending.has(key) || isFailureBackoff(key)) continue
        batch.set(key, name)
    }
    if (batch.size) void resolveRegistryEntries(batch)
}

export const subscribeRegistryEntryIndex = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

export const getRegistryEntryIndexVersion = (): number => version
