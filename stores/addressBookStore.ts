import { useCallback } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { Address } from '@/lib/address'
import { addressFormat } from '@/lib/address/formatter'
import { NetworkType } from '@/Models/Network'
import { AddressSelectionMode, classifyAddress } from '@/lib/address/detector'
import KnownInternalNames from '@/lib/knownIds'

export const NAME_MAX = 20
export const COUNTER_SHOW_AT = 15

export type SavedAddress = {
    address: string
    name: string
    networkTypes?: NetworkType[]
    networks?: string[]
}

type AddressBookState = {
    savedAddresses: SavedAddress[]
    addAddress: (entry: SavedAddress) => void
    removeAddress: (address: string) => void
    editAddress: (oldAddress: string, entry: SavedAddress) => void
    clearAll: () => void
}

const toSaved = (raw: string, name: string, networkTypes?: NetworkType[], networks?: string[]): SavedAddress | null => {
    const primary = networkTypes?.[0]
    const address = primary ? addressFormat({ address: raw.trim(), providerName: primary }) : raw.trim()
    const trimmed = name.trim()
    if (!address || !trimmed || trimmed.length > NAME_MAX) return null
    return { address, name: trimmed, networkTypes, networks: networks?.length ? networks : undefined }
}
// Migration for old stored addresses that didnt have stored type or networks on it. delete after some time 
type PersistedAddress = {
    address?: unknown
    name?: unknown
    networkType?: unknown
    networkTypes?: unknown
    networks?: unknown
}

const cleanStrings = (value: unknown) =>
    Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.length > 0) as string[] : undefined

const migrateLegacyScope = (address: string, networkTypes: NetworkType[] | undefined, networks: string[] | undefined, legacyType: NetworkType | undefined, hadNetworkTypes: boolean): Pick<SavedAddress, 'networkTypes' | 'networks'> => {
    const shouldMigrate = !hadNetworkTypes
        || legacyType === NetworkType.EVM
        || legacyType === NetworkType.Solana
        || (networkTypes?.includes(NetworkType.Solana) && !networks?.length)

    if (!shouldMigrate) return { networkTypes, networks }

    const detected = classifyAddress(address)
    const types = detected.types

    if (legacyType === NetworkType.Solana || types.includes(NetworkType.Solana)) {
        return { networkTypes: [NetworkType.Solana], networks: [KnownInternalNames.Networks.SolanaMainnet] }
    }
    if (types.includes(NetworkType.Fuel) && types.includes(NetworkType.Starknet)) {
        return { networkTypes: types }
    }
    if (legacyType === NetworkType.EVM || types.includes(NetworkType.EVM)) {
        return { networkTypes: [NetworkType.EVM] }
    }
    if (detected.selection === AddressSelectionMode.Auto && types.length) {
        return { networkTypes: types }
    }

    return { networkTypes: networkTypes?.length ? networkTypes : undefined, networks }
}

export const useAddressBookStore = create<AddressBookState>()(persist<AddressBookState, [], [], { savedAddresses: SavedAddress[] }>(
    (set) => ({
        savedAddresses: [],
        addAddress: (entry) => set(state => {
            const saved = toSaved(entry.address, entry.name, entry.networkTypes, entry.networks)
            if (!saved) return state
            const idx = state.savedAddresses.findIndex(e => Address.equals(e.address, saved.address, null, entry.networkTypes?.[0]))
            if (idx === -1) return { savedAddresses: [...state.savedAddresses, saved] }
            const updated = [...state.savedAddresses]
            updated[idx] = saved
            return { savedAddresses: updated }
        }),
        removeAddress: (address) => set(state => ({
            savedAddresses: state.savedAddresses.filter(e => !Address.equals(e.address, address, null, e.networkTypes?.[0]))
        })),
        editAddress: (oldAddress, entry) => set(state => {
            const saved = toSaved(entry.address, entry.name, entry.networkTypes, entry.networks)
            if (!saved) return state
            const next: SavedAddress[] = []
            let replaced = false
            for (const e of state.savedAddresses) {
                if (Address.equals(e.address, oldAddress, null, e.networkTypes?.[0])) {
                    if (!replaced) {
                        next.push(saved)
                        replaced = true
                    }
                    continue
                }
                if (Address.equals(e.address, saved.address, null, entry.networkTypes?.[0])) continue
                next.push(e)
            }
            if (!replaced) next.push(saved)
            return { savedAddresses: next }
        }),
        clearAll: () => set({ savedAddresses: [] }),
    }),
    {
        name: 'address-book',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
            savedAddresses: state.savedAddresses.map(e => ({ address: e.address, name: e.name, networkTypes: e.networkTypes, networks: e.networks })),
        }),
        merge: (persisted, current) => {
            const list = (persisted as { savedAddresses?: unknown[] } | undefined)?.savedAddresses
            const savedAddresses: SavedAddress[] = (Array.isArray(list) ? list : [])
                .map((e): SavedAddress | null => {
                    const o = e as PersistedAddress | null | undefined
                    if (!o || typeof o.address !== 'string' || o.address.trim().length === 0 || typeof o.name !== 'string' || o.name.trim().length === 0) {
                        return null
                    }
                    const parsedNetworkTypes = cleanStrings(o.networkTypes) as NetworkType[] | undefined
                    const legacyType = typeof o.networkType === 'string' && o.networkType.length > 0 ? o.networkType as NetworkType : undefined
                    const networkTypes = parsedNetworkTypes?.length ? parsedNetworkTypes : (legacyType ? [legacyType] : undefined)
                    const networks = cleanStrings(o.networks)
                    const scope = migrateLegacyScope(o.address, networkTypes, networks, legacyType, !!parsedNetworkTypes?.length)
                    return {
                        address: o.address,
                        name: o.name,
                        networkTypes: scope.networkTypes?.length ? scope.networkTypes : undefined,
                        networks: scope.networks?.length ? scope.networks : undefined,
                    }
                })
                .filter((e): e is SavedAddress => e !== null)
            return { ...current, savedAddresses }
        },
    }
))

export const findSavedAddress = (savedAddresses: SavedAddress[], address: string | undefined | null, network?: { name: string } | null, providerName?: string) => {
    if (!address) return undefined
    return savedAddresses.find(e => Address.equals(e.address, address, network, providerName))
}

export const savedAddressMatchesNetwork = (entry: SavedAddress, network: { name: string; type: NetworkType }): boolean => {
    if (entry.networkTypes?.length && !entry.networkTypes.includes(network.type)) return false
    if (entry.networks?.length && !entry.networks.includes(network.name)) return false
    return true
}

/** Reactive saved name, or undefined when the address isn't in the book. */
export const useAddressName = (address?: string | null, network?: { name: string } | null, providerName?: string) =>
    useAddressBookStore(s => findSavedAddress(s.savedAddresses, address, network, providerName)?.name)

export const useNamedAddress = (address?: string | null, network?: { name: string } | null, providerName?: string) => {
    const name = useAddressName(address, network, providerName)
    if (name) return name
    return address ? new Address(address, network ?? null, providerName!).toShortString() : ''
}

export const useLabeledAddress = (address?: string | null, network?: { name: string } | null, providerName?: string) => {
    const name = useAddressName(address, network, providerName)
    if (!address) return ''
    const short = new Address(address, network ?? null, providerName!).toShortString()
    return name ? `${name} (${short})` : short
}

/** Reactive: name-resolving finder bound to the current book snapshot. Use inside loops/memos. */
export const useAddressNameFinder = () => {
    const savedAddresses = useAddressBookStore(s => s.savedAddresses)
    return useCallback(
        (address: string | undefined | null, network?: { name: string } | null, providerName?: string) =>
            findSavedAddress(savedAddresses, address, network, providerName)?.name,
        [savedAddresses]
    )
}
