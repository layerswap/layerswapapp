import { create } from 'zustand'
import { NetworkType, RouteNetwork } from '../Models/Network';

interface AddressBookState {
    addresses: AddressItem[];
    addAddresses: (newAddresses: AddressItem[]) => void;
}

export enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Added Manually",
    RecentlyUsed = "Recently used"
}

export type AddressItem = {
    address: string,
    group: AddressGroup,
    networkType?: NetworkType
    date?: string
}

export const useAddressBookStore = create<AddressBookState>()((set) => ({
    addresses: [],
    addAddresses: (newAddresses: AddressItem[]) => set((state) => {
        return ({
            addresses: [
                ...newAddresses
            ]
        })
    }),
}))