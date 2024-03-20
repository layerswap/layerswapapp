import { create } from 'zustand'
import { NetworkType } from '../Models/CryptoNetwork';
import { ReactNode } from 'react';

interface AddressBookState {
    addresses: Address[];
    addAddresses: (newAddresses: Address[]) => void;
}

export enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Manual added",
    RecentlyUsed = "Recently used"
}

export type Address = {
    address: string,
    group: AddressGroup,
    networkType?: NetworkType
    date?: string
}

export const useAddressBookStore = create<AddressBookState>()((set) => ({
    addresses: [],
    addAddresses: (newAddresses: Address[]) => set((state) => {
        return ({
            addresses: [
                ...state.addresses.filter(a => !newAddresses.find(na => na.address === a.address) && !(a.group === AddressGroup.ConnectedWallet && a.address !== newAddresses.find(na => na.group === AddressGroup.ConnectedWallet)?.address)),
                ...newAddresses
            ]
        })
    }),
}))