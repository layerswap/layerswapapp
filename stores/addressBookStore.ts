import { create } from 'zustand'
import { NetworkType } from '../Models/CryptoNetwork';
import { ReactNode } from 'react';

interface AddressBookState {
    addresses: Address[];
    setAddresses: (addresses: Address[]) => void;
}

export type Address = {
    address: string,
    type: string,
    icon: (props: any) => ReactNode,
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