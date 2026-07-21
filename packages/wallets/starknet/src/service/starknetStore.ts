import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Wallet } from "@layerswap/wallet-core/types"

type StarknetAccountMap = { [key: string]: string }

export type StarknetConnectorSnapshot = {
    id: string
    name: string
    icon: string
}

interface StarknetStoreState {
    connectedWallets: Wallet[]
    connectWallet: (wallet: Wallet) => void
    starknetAccounts?: StarknetAccountMap
    addAccount: (connectorId: string, l1Address: string) => void
    removeAccount: (address: string) => void
    activeWalletAddress?: string
    setActiveWallet: (address: string) => void

    connectors: readonly StarknetConnectorSnapshot[]
    ready: boolean
    _setConnectors: (connectors: readonly StarknetConnectorSnapshot[]) => void
}

export const useStarknetStore = create<StarknetStoreState>()(
    persist(
        (set) => ({
            connectedWallets: [],
            setActiveWallet: (address) => set({ activeWalletAddress: address }),
            addAccount: (connectorId, l1Address) =>
                set((state) => ({
                    starknetAccounts: {
                        ...state.starknetAccounts,
                        [connectorId]: l1Address,
                    },
                })),
            removeAccount: (address) =>
                set((state) => {
                    const updatedAccounts = Object.entries(state.starknetAccounts || {}).reduce(
                        (acc, [key, value]) => {
                            if (value.toLowerCase() !== address.toLowerCase()) {
                                acc[key] = value
                            }
                            return acc
                        },
                        {} as StarknetAccountMap,
                    )

                    const updatedWallets = state.connectedWallets.filter(
                        (w) => w.address.toLowerCase() !== address.toLowerCase(),
                    )

                    let newActiveAddress: string | undefined = state.activeWalletAddress
                    if (state.activeWalletAddress?.toLowerCase() === address.toLowerCase()) {
                        newActiveAddress = updatedWallets.length > 0 ? updatedWallets[0].address : undefined
                    }
                    return {
                        starknetAccounts: updatedAccounts,
                        connectedWallets: updatedWallets,
                        activeWalletAddress: newActiveAddress,
                    }
                }),
            connectWallet: (wallet) => set((state) => {
                if (state.connectedWallets.find(w => w.providerName === wallet.providerName && w.id === wallet.id && w.address === wallet.address)) {
                    return state
                }
                return { connectedWallets: [...state.connectedWallets, wallet] }
            }),

            connectors: [],
            ready: false,
            _setConnectors: (connectors) => set({ connectors, ready: connectors.length > 0 }),
        }),
        {
            name: 'ls-starknet-accounts',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                starknetAccounts: state.starknetAccounts,
                activeWalletAddress: state.activeWalletAddress,
            }),
        },
    ),
)
