import { useSyncExternalStore } from 'react'
import {
    getAdditionalConnectorsStore,
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
