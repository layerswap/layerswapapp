import { nameKey } from '../identity/nameKey'
import { WALLET_CATALOG } from './entries'
import type { WalletCatalogEntry } from './types'

export { BLOCKED_REGISTRY_SLUGS, WALLET_CATALOG } from './entries'
export type { WalletCatalogEntry } from './types'

export type CatalogIndex = {
    byRdns: Map<string, WalletCatalogEntry>
    byRegistryId: Map<string, WalletCatalogEntry>
    byNativeId: Map<string, WalletCatalogEntry>
    byNameAlias: Map<string, WalletCatalogEntry>
}

let _index: CatalogIndex | null = null

export function getCatalogIndex(): CatalogIndex {
    if (_index) return _index
    const byRdns = new Map<string, WalletCatalogEntry>()
    const byRegistryId = new Map<string, WalletCatalogEntry>()
    const byNativeId = new Map<string, WalletCatalogEntry>()
    const byNameAlias = new Map<string, WalletCatalogEntry>()

    for (const entry of WALLET_CATALOG) {
        for (const rdns of entry.rdns ?? []) byRdns.set(rdns.toLowerCase(), entry)
        for (const registryId of entry.registryIds ?? []) byRegistryId.set(registryId.toLowerCase(), entry)
        for (const ids of Object.values(entry.nativeIds ?? {})) {
            for (const id of ids ?? []) byNativeId.set(id.toLowerCase(), entry)
        }
        const aliases = new Set<string>([nameKey(entry.id)])
        if (entry.displayName) aliases.add(nameKey(entry.displayName))
        for (const alias of entry.nameAliases ?? []) aliases.add(nameKey(alias))
        for (const alias of aliases) {
            if (alias) byNameAlias.set(alias, entry)
        }
    }

    _index = { byRdns, byRegistryId, byNativeId, byNameAlias }
    return _index
}
