import { create } from 'zustand'
import { NetworkType, RouteNetwork } from '../Models/Network';
import { addressFormat } from '../lib/address/formatter';

interface AddressBookState {
    addresses: AddressItem[];
    addAddresses: (newAddresses: AddressItem[], network: RouteNetwork) => void;
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
    addAddresses: (newAddresses: AddressItem[], network: RouteNetwork) => set((state) => {
        return ({
            addresses: [
                ...state.addresses.filter(a => !newAddresses.find(na => addressFormat(na.address, network) === addressFormat(a.address, network)) && !(a.group === AddressGroup.ConnectedWallet && addressFormat(newAddresses.find(na => na.group === AddressGroup.ConnectedWallet)?.address || '', network) !== addressFormat(a.address, network))),
                ...newAddresses
            ]
        })
    }),
}))