import { create } from 'zustand'

interface EVMAddressesState {
    EVMAddresses: EVMAddresses[];
    setEVMAddresses: (addresses: EVMAddresses[]) => void;
}

export type EVMAddresses = {
    connectorName: string;
    addresses: string[]
}

export const useEVMAddressesStore = create<EVMAddressesState>()((set) => ({
    EVMAddresses: [],
    setEVMAddresses: (addresses) => set({
        EVMAddresses: addresses
    })
}))