import { create } from 'zustand'
import { Wallet } from '@/types/wallet';
import { createJSONStorage, persist } from 'zustand/middleware';

type ParadexAccount = {
    l1Address: string,
    paradexAddress: string
}
interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (providerName: string, connectorName?: string) => void;
    selectedProveder?: string;
    selectProvider: (providerName: string) => void;
    paradexAccounts?: { [key: string]: string };
    addParadexAccount: (v: ParadexAccount) => void;
    removeParadexAccount: (address: string) => void;
}

export const useWalletStore = create<WalletState>()(persist((set) => ({
    connectedWallets: [],
    selectProvider: (providerName) => set({ selectedProveder: providerName }),
    addParadexAccount: (value) => set((state) => ({ paradexAccounts: { ...state.paradexAccounts, ...{ [value.l1Address.toLowerCase()]: value.paradexAddress } } })),
    removeParadexAccount: (value) => set((state) => {
        const { [value.toLowerCase()]: _, ...updatedAccounts } = state.paradexAccounts || {};
        return { paradexAccounts: updatedAccounts }
    }),
    //    As we are calling this method for adding wallets to the store from provider hooks,
    // in some providers they are called from useEffect hooks so are triggered multiple times,
    // we check if the wallet is already connected do not modify the state
    // TODO: get rid of useEffect hooks and implement singelton pattern
    connectWallet: (wallet) => set((state) => {
        const existingWallet = state.connectedWallets.find(w => w.providerName == wallet.providerName && w.id == wallet.id && w.address == wallet.address);
        if (existingWallet) {
            return {
                connectedWallets: [
                    ...state.connectedWallets.filter(w => !(w.providerName == wallet.providerName && w.id == wallet.id && w.address == wallet.address)),
                    wallet
                ]
            }
        }
        return ({
            connectedWallets: [
                ...state.connectedWallets,
                wallet
            ]
        })
    }),
    disconnectWallet: (providerName, connectorName) => set((state) => ({
        connectedWallets: state.connectedWallets.filter(w => connectorName ? !(w.providerName == providerName && w.id == connectorName) : w.providerName != providerName)
    }))
}), {
    name: 'ls-paradex-accounts',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ paradexAccounts: state.paradexAccounts }),
},))