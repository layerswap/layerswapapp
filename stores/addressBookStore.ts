import { create } from 'zustand'

interface AddressBookState {
    addresses: Address[];
    addAddress: (address: Address) => void;
}

export type Address = {
    address: string,
    type: string,
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