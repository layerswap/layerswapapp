import { create } from 'zustand'
import { AddressGroup } from '../components/Input/Address/AddressPicker';

export type AddressItem = {
    address: string,
    group: AddressGroup,
    date?: string
}

interface AddressesState {
    addresses: AddressItem[];
    setAddresses: (addresses: AddressItem[]) => void;
}

export const useAddressesStore = create<AddressesState>()((set) => ({
    addresses: [],
    setAddresses: (addresses) => set(() => {
        return ({
            addresses: addresses
        })
    }),
}))