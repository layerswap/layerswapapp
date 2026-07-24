import { useSyncExternalStore } from 'react'
import {
    getAdditionalConnectorsStore,
    getInstantiatedAdditionalConnectorsStores,
    subscribeAdditionalConnectorsStores,
    type AdditionalConnectorsSnapshot,
    type WalletConnectRequestResult,
} from './additionalConnectorsStore'

export type { WalletConnectRequestResult, AdditionalConnectorsSnapshot }

/**
 * Thin React adapter over the per-namespace external store. Wallet packages
 * should prefer `getAdditionalConnectorsStore(...)` directly so they don't
 * need a React render to read the value.
 */
export function useAdditionalConnectors(namespace: string, projectId?: string) {
    const store = getAdditionalConnectorsStore(namespace, projectId)
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
    return {
        browseConnectors: snapshot.browseConnectors,
        browseMetadata: snapshot.browseMetadata,
        requestAdditionalConnectors: store.requestAdditionalConnectors,
        addRecentConnector: store.addRecentConnector,
    }
}

// Joined into a primitive so `useSyncExternalStore` can compare snapshots by
// value — an array would be a fresh identity per call and loop the render.
const getBrowseStatusesKey = () => getInstantiatedAdditionalConnectorsStores()
    .map(store => store.getSnapshot().browseMetadata.status)
    .join('|')
const getServerBrowseStatusesKey = () => ''

/**
 * Aggregated page-1 browse status across every instantiated namespace store
 * (eip155, solana, …). `anyLoading` includes `idle` stores: in the contexts
 * where this hook is used (the open connect modal) an idle store is one whose
 * ensure trigger simply hasn't fired yet, and treating it as settled would
 * flash the "list is complete" state.
 */
export function useRegistryBrowseStatuses(): { anyLoading: boolean; anyError: boolean } {
    const key = useSyncExternalStore(subscribeAdditionalConnectorsStores, getBrowseStatusesKey, getServerBrowseStatusesKey)
    const statuses = key ? key.split('|') : []
    return {
        anyLoading: statuses.some(status => status === 'loading' || status === 'idle'),
        anyError: statuses.some(status => status === 'error'),
    }
}
