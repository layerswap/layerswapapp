import { useCallback } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { Address } from '@/lib/address'

export type SavedAddress = {
    address: Address
    name: string
}

type AddressBookState = {
    savedAddresses: SavedAddress[]
    addAddress: (entry: { address: string; name: string }) => void
    removeAddress: (address: string) => void
    editAddress: (oldAddress: string, entry: { address: string; name: string }) => void
    clearAll: () => void
}

const wrap = (raw: string): Address => new Address(raw.trim(), null, 'address-book')

export const useAddressBookStore = create<AddressBookState>()(persist<AddressBookState, [], [], { savedAddresses: { raw: string; name: string }[] }>(
    (set) => ({
        savedAddresses: [],
        addAddress: (entry) => set(state => {
            const address = wrap(entry.address)
            const name = entry.name?.trim()
            if (!address.raw || !name) return state
            const idx = state.savedAddresses.findIndex(e => Address.equals(e.address.raw, address.raw, null, 'address-book'))
            if (idx === -1) return { savedAddresses: [...state.savedAddresses, { address, name }] }
            const updated = [...state.savedAddresses]
            updated[idx] = { address, name }
            return { savedAddresses: updated }
        }),
        removeAddress: (address) => set(state => {
            const target = wrap(address)
            return { savedAddresses: state.savedAddresses.filter(e => !Address.equals(e.address.raw, target.raw, null, 'address-book')) }
        }),
        editAddress: (oldAddress, entry) => set(state => {
            const address = wrap(entry.address)
            const name = entry.name?.trim()
            if (!address.raw || !name) return state
            const oldKey = wrap(oldAddress).raw
            const next: SavedAddress[] = []
            let replaced = false
            for (const e of state.savedAddresses) {
                if (Address.equals(e.address.raw, oldKey, null, 'address-book')) {
                    if (!replaced) {
                        next.push({ address, name })
                        replaced = true
                    }
                    continue
                }
                if (Address.equals(e.address.raw, address.raw, null, 'address-book')) continue
                next.push(e)
            }
            if (!replaced) next.push({ address, name })
            return { savedAddresses: next }
        }),
        clearAll: () => set({ savedAddresses: [] }),
    }),
    {
        name: 'address-book',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
            savedAddresses: state.savedAddresses.map(e => ({ raw: e.address.raw, name: e.name })),
        }),
        merge: (persisted, current) => {
            const list = (persisted as { savedAddresses?: unknown[] } | undefined)?.savedAddresses
            const savedAddresses: SavedAddress[] = (Array.isArray(list) ? list : [])
                .filter((e): e is { raw: string; name: string } => {
                    const o = e as { raw?: unknown; name?: unknown } | null | undefined
                    return !!o
                        && typeof o.raw === 'string'
                        && typeof o.name === 'string'
                        && o.name.trim().length > 0
                })
                .map(e => ({ address: wrap(e.raw), name: e.name }))
            return { ...current, savedAddresses }
        },
    }
))

const findSavedAddress = (savedAddresses: SavedAddress[], address: string | undefined | null, network?: { name: string } | null, providerName?: string) => {
    if (!address) return undefined
    return savedAddresses.find(e => Address.equals(e.address.raw, address, network, providerName))
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
