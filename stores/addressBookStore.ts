import { useCallback } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { Address } from '@/lib/address'
import { addressFormat } from '@/lib/address/formatter'
import { NetworkType } from '@/Models/Network'

export const NAME_MAX = 20
export const COUNTER_SHOW_AT = 15

export type SavedAddress = {
    address: string
    name: string
    networkType?: NetworkType
}

type AddressBookState = {
    savedAddresses: SavedAddress[]
    addAddress: (entry: SavedAddress) => void
    removeAddress: (address: string) => void
    editAddress: (oldAddress: string, entry: SavedAddress) => void
    clearAll: () => void
}

const toSaved = (raw: string, name: string, networkType?: NetworkType): SavedAddress | null => {
    const address = networkType ? addressFormat({ address: raw.trim(), providerName: networkType }) : raw.trim()
    const trimmed = name.trim()
    if (!address || !trimmed || trimmed.length > NAME_MAX) return null
    return { address, name: trimmed, networkType }
}

export const useAddressBookStore = create<AddressBookState>()(persist<AddressBookState, [], [], { savedAddresses: SavedAddress[] }>(
    (set) => ({
        savedAddresses: [],
        addAddress: (entry) => set(state => {
            const saved = toSaved(entry.address, entry.name, entry.networkType)
            if (!saved) return state
            const idx = state.savedAddresses.findIndex(e => Address.equals(e.address, saved.address, null, entry.networkType))
            if (idx === -1) return { savedAddresses: [...state.savedAddresses, saved] }
            const updated = [...state.savedAddresses]
            updated[idx] = saved
            return { savedAddresses: updated }
        }),
        removeAddress: (address) => set(state => ({
            savedAddresses: state.savedAddresses.filter(e => !Address.equals(e.address, address, null, e.networkType))
        })),
        editAddress: (oldAddress, entry) => set(state => {
            const saved = toSaved(entry.address, entry.name, entry.networkType)
            if (!saved) return state
            const next: SavedAddress[] = []
            let replaced = false
            for (const e of state.savedAddresses) {
                if (Address.equals(e.address, oldAddress, null, e.networkType)) {
                    if (!replaced) {
                        next.push(saved)
                        replaced = true
                    }
                    continue
                }
                if (Address.equals(e.address, saved.address, null, entry.networkType)) continue
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
            savedAddresses: state.savedAddresses.map(e => ({ address: e.address, name: e.name, networkType: e.networkType })),
        }),
        merge: (persisted, current) => {
            const list = (persisted as { savedAddresses?: unknown[] } | undefined)?.savedAddresses
            const savedAddresses: SavedAddress[] = (Array.isArray(list) ? list : [])
                .filter((e): e is SavedAddress => {
                    const o = e as { address?: unknown; name?: unknown; networkType?: unknown } | null | undefined
                    return !!o
                        && typeof o.address === 'string'
                        && o.address.trim().length > 0
                        && typeof o.name === 'string'
                        && o.name.trim().length > 0
                        && (o.networkType === undefined || (typeof o.networkType === 'string' && o.networkType.length > 0))
                })
                .map(e => ({ address: e.address, name: e.name, networkType: e.networkType }))
            return { ...current, savedAddresses }
        },
    }
))

const findSavedAddress = (savedAddresses: SavedAddress[], address: string | undefined | null, network?: { name: string } | null, providerName?: string) => {
    if (!address) return undefined
    return savedAddresses.find(e => Address.equals(e.address, address, network, providerName))
}

/** Reactive: component re-renders when the resolved name for `address` changes. */
export const useAddressName = (address: string | undefined | null, network?: { name: string } | null, providerName?: string) =>
    useAddressBookStore(s => findSavedAddress(s.savedAddresses, address, network, providerName)?.name)

/** Reactive: name-resolving finder bound to the current book snapshot. Use inside loops/memos. */
export const useAddressNameFinder = () => {
    const savedAddresses = useAddressBookStore(s => s.savedAddresses)
    return useCallback(
        (address: string | undefined | null, network?: { name: string } | null, providerName?: string) =>
            findSavedAddress(savedAddresses, address, network, providerName)?.name,
        [savedAddresses]
    )
}
