import { create } from 'zustand'
import { WalletProvider } from '../hooks/useWallet';

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
    setOpen: (value: boolean) => void;
}

export const useWalletModalState = create<WalletModalState>()((set) => ({
    open: false,
    selectedProvider: undefined,
    setSelectedProvider: (value) => set((state) => {
        return ({
            ...state,
            selectedProvider: value
        })
    }),
    setOpen: (value) => set((state) => {
        return ({
            ...state,
            open: value
        })
    }),
}))