import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { Address as AddressClass } from '@/lib/address'

export type ManualDestAddress = {
    address: string
    providerName: string
}

interface ManualDestAddressesState {
    manualDestAddresses: ManualDestAddress[]
    addManualDestAddress: (entry: ManualDestAddress) => void
    removeManualDestAddress: (address: string, providerName: string) => void
}

export const useManualDestAddressesStore = create<ManualDestAddressesState>()(persist((set) => ({
    manualDestAddresses: [],
    addManualDestAddress: (entry) => set(state => ({
        manualDestAddresses: state.manualDestAddresses.some(
            e => e.providerName === entry.providerName
                && AddressClass.equals(e.address, entry.address, null, entry.providerName)
        )
            ? state.manualDestAddresses
            : [...state.manualDestAddresses, entry]
    })),
    removeManualDestAddress: (address, providerName) => set(state => ({
        manualDestAddresses: state.manualDestAddresses.filter(
            e => !(e.providerName === providerName
                && AddressClass.equals(e.address, address, null, providerName))
        )
    })),
}), {
    name: 'manualDestAddresses',
    storage: createJSONStorage(() => localStorage),
}))
