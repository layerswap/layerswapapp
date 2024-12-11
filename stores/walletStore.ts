import { create } from 'zustand'
import { Wallet } from '../Models/WalletProvider';

interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (providerName: string, connectorName?: string) => void;
    selectedProveder?: string;
    selectProvider: (providerName: string) => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
    connectedWallets: [],
    selectProvider: (providerName) => set({ selectedProveder: providerName }),
    connectWallet: (wallet) => set((state) => {
        return ({
            connectedWallets: [
                ...state.connectedWallets.filter(w => !(w.providerName == wallet.providerName && w.connector == wallet.connector)),
                wallet
            ]
        })
    }),
    disconnectWallet: (providerName, connectorName) => set((state) => ({
        connectedWallets: state.connectedWallets.filter(w => connectorName ? !(w.providerName == providerName && w.connector == connectorName): w.providerName != providerName)
    }))
}))