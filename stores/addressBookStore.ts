import { create } from 'zustand'
import { NetworkType } from '../Models/Network';

interface AddressBookState {
    addresses: AddressItem[];
    addAddresses: (newAddresses: AddressItem[]) => void;
}

export enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Manual added",
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
                ...state.addresses.filter(a => !newAddresses.find(na => na.address === a.address) && !(a.group === AddressGroup.ConnectedWallet && a.address !== newAddresses.find(na => na.group === AddressGroup.ConnectedWallet)?.address)),
                ...newAddresses
            ]
        })
    }),
}))