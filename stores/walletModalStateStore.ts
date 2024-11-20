import { create } from 'zustand'
import { WalletProvider } from '../Models/WalletProvider';

export type ModalWalletProvider = WalletProvider & {
    connector?: {
        name: string;
        qr?: string;
        iconUrl?: string;
    }
}

interface WalletModalState {
    open: boolean;
    selectedProvider: ModalWalletProvider | undefined;
    setSelectedProvider: (value: ModalWalletProvider | undefined) => void;
    setActiveAccountAddress: (value: `0x${string}` | undefined) => void;
    activeAccountAddress: `0x${string}` | undefined;
    setOpen: (value: boolean) => void;
}

export const useWalletModalState = create<WalletModalState>()((set) => ({
    open: false,
    selectedProvider: undefined,
    activeAccountAddress: undefined,
    setSelectedProvider: (value) => set((state) => {
        return ({
            ...state,
            selectedProvider: value
        })
    }),
    setActiveAccountAddress: (value) => set((state) => {
        return ({
            ...state,
            activeAccountAddress: value
        })
    }),
    setOpen: (value) => set((state) => {
        return ({
            ...state,
            open: value
        })
    }),
}))