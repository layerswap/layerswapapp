import { getCatalogIndex } from '../catalog'
import type { WalletCatalogEntry } from '../catalog/types'
import { nameKey } from './nameKey'
import type { IdentityHints, WalletId } from './types'

export type WalletIdentity = {
    id: WalletId
    catalog?: WalletCatalogEntry
    matchedBy: 'rdns' | 'registryId' | 'nativeId' | 'nameAlias' | 'nameKey' | 'opaque'
}

export function resolveWalletIdentity(hints: IdentityHints): WalletIdentity {
    const index = getCatalogIndex()

    const rdns = hints.rdns?.toLowerCase()
    if (rdns) {
        const entry = index.byRdns.get(rdns)
        if (entry) return { id: entry.id, catalog: entry, matchedBy: 'rdns' }
    }

    const registryId = hints.registryId?.toLowerCase()
    if (registryId) {
        const entry = index.byRegistryId.get(registryId)
        if (entry) return { id: entry.id, catalog: entry, matchedBy: 'registryId' }
    }

    const nativeId = hints.nativeId?.toLowerCase()
    if (nativeId) {
        const entry = index.byNativeId.get(nativeId)
        if (entry) return { id: entry.id, catalog: entry, matchedBy: 'nativeId' }
    }

    if (hints.name) {
        const key = nameKey(hints.name)
        if (key) {
            const entry = index.byNameAlias.get(key)
            if (entry) return { id: entry.id, catalog: entry, matchedBy: 'nameAlias' }
            return { id: key, matchedBy: 'nameKey' }
        }
    }

    if (nativeId) return { id: `native:${hints.ecosystem ?? ''}:${nativeId}`, matchedBy: 'opaque' }
    return { id: `opaque:${rdns ?? registryId ?? ''}`, matchedBy: 'opaque' }
}

type IdentifiableConnector = {
    identity?: WalletIdentity
    rdns?: string
    registryId?: string
    id?: string
    name?: string
}

export const resolveConnectorIdentity = (connector: IdentifiableConnector): WalletIdentity =>
    connector.identity ?? resolveWalletIdentity({
        rdns: connector.rdns ?? (connector.id?.includes('.') ? connector.id : undefined),
        registryId: connector.registryId,
        nativeId: connector.id,
        name: connector.name,
    })
