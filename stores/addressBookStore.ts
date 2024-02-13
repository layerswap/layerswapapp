import { create } from 'zustand'
import { NetworkType } from '../Models/CryptoNetwork';
import { ReactNode } from 'react';

interface AddressBookState {
    addresses: Address[];
    addAddresses: (newAddresses: Address[]) => void;
}

export type Address = {
    address: string,
    group: string,
    icon: (props: any) => ReactNode,
    networkType?: NetworkType
    date?: string
}

export const useAddressBookStore = create<AddressBookState>()((set) => ({
    addresses: [],
    addAddresses: (newAddresses: Address[]) => set((state) => {
        return ({
            addresses: [
                ...state.addresses.filter(a => !newAddresses.find(na => na.address === a.address)),
                ...newAddresses
            ]
        })
    }),
}))