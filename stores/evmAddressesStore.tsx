import { create } from 'zustand'

interface EVMAddressesState {
    EVMAddresses: EVMAddresses[];
    addEVMAddresses: (addressItem: EVMAddresses | undefined) => void;
}

export type EVMAddresses = {
    connectorName: string;
    addresses: string[]
}

export const useEVMAddressesStore = create<EVMAddressesState>()((set) => ({
    EVMAddresses: [],
    addEVMAddresses: (addressItem) => set((state) => ({
        EVMAddresses: [
            ...state.EVMAddresses.filter((item) => item.connectorName !== addressItem?.connectorName),
            ...(addressItem ? [addressItem] : [])
        ]
    }))
}))