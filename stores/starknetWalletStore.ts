import { create } from 'zustand'
import { Wallet } from '../Models/WalletProvider'
import { createJSONStorage, persist } from 'zustand/middleware'

type StarknetAccountMap = { [key: string]: string }

interface StarknetStoreState {
    connectedWallets: Wallet[]
    connectWallet: (wallet: Wallet) => void
    disconnectWallet: (providerName: string, connectorName?: string) => void
    selectedProvider?: string
    selectProvider: (providerName: string) => void
    starknetAccounts?: StarknetAccountMap
    addAccount: (connectorId: string, l1Address: string, isActive?: boolean) => void;
    removeAccount: (address: string) => void
    activeWalletAddress?: string;
    setActiveWallet: (address: string) => void;
}

export const useStarknetStore = create<StarknetStoreState>()(
    persist(
        (set) => ({
            connectedWallets: [],
            setActiveWallet: (address) => set({ activeWalletAddress: address }),
            selectProvider: (providerName) => set({ selectedProvider: providerName }),
            addAccount: (connectorId, l1Address, isActive = false) =>
                set((state) => {
                    const updatedAccounts = {
                        ...state.starknetAccounts,
                        [connectorId]: l1Address,
                    };
                    const updatedState: Partial<StarknetStoreState> = {
                        starknetAccounts: updatedAccounts,
                    };
                    if (isActive) {
                        updatedState.activeWalletAddress = l1Address;
                    }
                    return updatedState;
                }),
            removeAccount: (address) =>
                set((state) => {
                    const { [address.toLowerCase()]: _, ...updated } = state.starknetAccounts || {}
                    return { starknetAccounts: updated }
                }),
            connectWallet: (wallet) =>
                set((state) => {
                    const exists = state.connectedWallets.some(
                        (w) =>
                            w.providerName === wallet.providerName &&
                            w.id === wallet.id &&
                            w.address === wallet.address
                    )
                    if (exists) return state
                    return { connectedWallets: [...state.connectedWallets, wallet] }
                }),
            disconnectWallet: (providerName, connectorName) =>
                set((state) => {
                    const filteredWallets = state.connectedWallets.filter((w) =>
                        connectorName
                            ? !(w.providerName === providerName && w.id === connectorName)
                            : w.providerName !== providerName
                    );

                    let updatedAccounts = { ...state.starknetAccounts };
                    if (connectorName && updatedAccounts[connectorName]) {
                        delete updatedAccounts[connectorName];
                    }
                    return {
                        connectedWallets: filteredWallets,
                        starknetAccounts: updatedAccounts,
                    };
                }),
        }),
        {
            name: 'ls-starknet-accounts',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                starknetAccounts: state.starknetAccounts,
                activeWalletAddress: state.activeWalletAddress,
            }),
        }
    )
)