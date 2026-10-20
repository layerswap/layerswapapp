import { type Wallet } from '@layerswap/widget-types';
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type StarknetAccountMap = { [key: string]: string }

export type StarknetConnectorSnapshot = {
    id: string
    name: string
    icon: string
}

interface StarknetStoreState {
    connectedWallets: Wallet[]
    replaceConnectorWallet: (connectorId: string, wallet: Wallet, activate?: boolean) => void
    starknetAccounts?: StarknetAccountMap
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
            // One authorized account per connector. Connect and restoration must
            // replace the signer, persisted address and selection in one notification.
            replaceConnectorWallet: (connectorId, wallet, activate = false) => set(state => {
                const previousAddress = state.starknetAccounts?.[connectorId]
                const connectedWallets = state.connectedWallets.filter(existing =>
                    existing.id !== wallet.id || existing.providerName !== wallet.providerName)
                const replaceActive = activate || !state.activeWalletAddress
                    || state.activeWalletAddress.toLowerCase() === previousAddress?.toLowerCase()
                    || state.connectedWallets.some(existing => !connectedWallets.includes(existing)
                        && existing.address.toLowerCase() === state.activeWalletAddress?.toLowerCase())
                return {
                    connectedWallets: [...connectedWallets, wallet],
                    starknetAccounts: { ...state.starknetAccounts, [connectorId]: wallet.address },
                    activeWalletAddress: replaceActive ? wallet.address : state.activeWalletAddress,
                }
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
