import { create } from 'zustand'
import { AddressItem } from '../components/Input/Address/AddressPicker';

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