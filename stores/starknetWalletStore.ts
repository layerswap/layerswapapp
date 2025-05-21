import { create } from 'zustand'
import { Wallet } from '../Models/WalletProvider'
import { createJSONStorage, persist } from 'zustand/middleware'

type StarknetAccountMap = { [key: string]: string }

interface StarknetStoreState {
    connectedWallets: Wallet[]
    connectWallet: (wallet: Wallet) => void
    starknetAccounts?: StarknetAccountMap
    addAccount: (connectorId: string, l1Address: string) => void;
    removeAccount: (address: string) => void
    activeWalletAddress?: string;
    setActiveWallet: (address: string) => void;
}

export const useStarknetStore = create<StarknetStoreState>()(
    persist(
        (set) => ({
            connectedWallets: [],
            setActiveWallet: (address) => set({ activeWalletAddress: address }),
            addAccount: (connectorId, l1Address) =>
                set((state) => {
                    const updatedAccounts = {
                        ...state.starknetAccounts,
                        [connectorId]: l1Address,
                    };
                    const updatedState: Partial<StarknetStoreState> = {
                        starknetAccounts: updatedAccounts,
                    };
                    return updatedState;
                }),
            removeAccount: (address) =>
                set((state) => {
                    const updatedAccounts = Object.entries(state.starknetAccounts || {}).reduce(
                        (acc, [key, value]) => {
                            if (value.toLowerCase() !== address.toLowerCase()) {
                                acc[key] = value;
                            }
                            return acc;
                        },
                        {}
                    );

                    const updatedWallets = state.connectedWallets.filter(
                        (w) => w.address.toLowerCase() !== address.toLowerCase()
                    );

                    let newActiveAddress: string | undefined = state.activeWalletAddress;
                    if (state.activeWalletAddress?.toLowerCase() === address.toLowerCase()) {
                        newActiveAddress = updatedWallets.length > 0 ? updatedWallets[0].address : undefined;
                    }
                    return {
                        starknetAccounts: updatedAccounts,
                        connectedWallets: updatedWallets,
                        activeWalletAddress: newActiveAddress
                    };
                }),
            connectWallet: (wallet) => set((state) => {
                if (state.connectedWallets.find(w => w.providerName == wallet.providerName && w.id == wallet.id && w.address == wallet.address)) {
                    return state
                }
                return ({
                    connectedWallets: [
                        ...state.connectedWallets,
                        wallet
                    ]
                })
            })
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