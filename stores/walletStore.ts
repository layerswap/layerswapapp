import { create } from 'zustand'
import { Wallet } from '../Models/WalletProvider';

interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (providerName: string) => void;
    selectedProveder?: string;
    selectProvider: (providerName: string) => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
    connectedWallets: [],
    selectProvider: (providerName) => set({ selectedProveder: providerName }),
    connectWallet: (wallet) => set((state) => {
        return ({
            connectedWallets: [
                ...state.connectedWallets.filter(w => w.providerName !== wallet.providerName),
                wallet
            ]
        })
    }),
    disconnectWallet: (providerName) => set((state) => ({
        connectedWallets: state.connectedWallets.filter(w => w.providerName !== providerName)
    }))
}))