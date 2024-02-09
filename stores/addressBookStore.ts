import { create } from 'zustand'
import { NetworkType } from '../Models/CryptoNetwork';

interface AddressBookState {
    addresses: Address[];
    setAddresses: (addresses: Address[]) => void;
}

export type Address = {
    address: string,
    type: string,
    networkType?: NetworkType
    date?: string
}

export const useAddressBookStore = create<AddressBookState>()((set) => ({
    addresses: [],
    setAddresses: (addresses: Address[]) => set(() => {
        return ({
            addresses: addresses
        })
    }),
}))