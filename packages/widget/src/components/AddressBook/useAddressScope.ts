import { useMemo } from 'react'
import { useSettingsState } from '@/context/settings'
import { NetworkType } from '@/Models/Network'
import { classifyAddress, AddressTypeLabel } from '@layerswap/utils'
import KnownInternalNames from '@/lib/knownIds'

export type ScopeItem = { name: string, logo?: string }

export type AddressScope = {
    /** Networks in scope, with display name + logo. Avatar/stack shows up to 3 + a "+N". */
    items: ScopeItem[]
    /** A friendly one-liner when the scope is "everything" of a type (e.g. "All EVM networks"). */
    summary?: string
}

/**
 * Resolves a saved address's network scope into the networks to badge:
 *  - Specific networks chosen → those networks.
 *  - Overlapping address types (e.g. Fuel + Starknet) → one flagship per type.
 *  - A whole provider type with no explicit networks → every network of that type.
 */
export function useAddressScope(address: string, networkTypes?: NetworkType[], networks?: string[]): AddressScope {
    const { networks: allNetworks } = useSettingsState()

    return useMemo<AddressScope>(() => {
        const dedupe = (items: ScopeItem[]) => {
            const seen = new Set<string>()
            const out: ScopeItem[] = []
            for (const it of items) if (it.name && !seen.has(it.name)) { seen.add(it.name); out.push(it) }
            return out
        }
        const finalize = (items: ScopeItem[], summary?: string): AddressScope => {
            const d = dedupe(items)
            // A single-network scope reads better as just its name than "All X networks".
            return { items: d, summary: d.length === 1 ? d[0].name : summary }
        }
        // Flagship network standing in for a whole provider type (EVM → Ethereum, etc.).
        const typeItem = (type: NetworkType): ScopeItem => {
            const ofType = allNetworks.filter(n => n.type === type)
            const flagship = ofType.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet) ?? ofType[0]
            return { name: AddressTypeLabel(type), logo: flagship?.logo }
        }

        const types = networkTypes?.length ? networkTypes : classifyAddress(address).types
        if (!types.length) return { items: [], summary: undefined }

        // Specific networks chosen (incl. "all of a type", which stores every name).
        if (networks?.length) {
            const items = networks
                .map(name => allNetworks.find(n => n.name === name))
                .filter(Boolean)
                .map(n => ({ name: n!.display_name, logo: n!.logo }))
            // If the picked set covers every network of a single type, call it "all".
            const single = types.length === 1 ? allNetworks.filter(n => n.type === types[0]) : []
            const isAll = single.length > 0 && items.length >= single.length
            return finalize(items, isAll ? `All ${AddressTypeLabel(types[0])} networks` : undefined)
        }
        // Overlapping types — represent each provider type.
        if (types.length > 1) {
            return finalize(types.map(typeItem))
        }
        // Whole single type with no explicit networks — every network of that type.
        return finalize(
            allNetworks.filter(n => n.type === types[0]).map(n => ({ name: n.display_name, logo: n.logo })),
            `All ${AddressTypeLabel(types[0])} networks`,
        )
    }, [allNetworks, address, networkTypes, networks])
}
