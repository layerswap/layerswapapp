import { create } from 'zustand'
import { NetworkType } from '../Models/CryptoNetwork';

interface AddressBookState {
    addresses: Address[];
    addAddress: (address: Address) => void;
}

export type Address = {
    address: string,
    type: string,
    networkType?: NetworkType
    date?: string
}

export const useAddressBookStore = create<AddressBookState>()((set) => ({
    addresses: [],
    addAddress: (address: Address) => set((state) => {
        return ({
            addresses: [
                ...state.addresses.filter(a => a.address !== address.address),
                address
            ]
        })
    }),
}))