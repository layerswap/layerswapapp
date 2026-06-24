import { create } from 'zustand'
import type { Fuel, FuelConnector } from '@fuel-ts/account'
import type { Wallet } from '@layerswap/widget/types'

export type FuelStoreState = {
    connectors: readonly FuelConnector[]
    fuel: Fuel | undefined
    ready: boolean
    connectedWallets: Wallet[]

    _setConnectors: (connectors: readonly FuelConnector[]) => void
    _setFuel: (fuel: Fuel | undefined) => void
    connectWallet: (wallet: Wallet) => void
    disconnectWallet: (connectorName?: string) => void
}

export const useFuelStore = create<FuelStoreState>()((set) => ({
    connectors: [],
    fuel: undefined,
    ready: false,
    connectedWallets: [],

    _setConnectors: (connectors) => set({ connectors, ready: connectors.length > 0 }),
    _setFuel: (fuel) => set({ fuel }),
    // Mirrors the global wallet store's dedupe-by-(id,address) semantics so the
    // same connector reconnecting replaces its entry instead of appending.
    connectWallet: (wallet) => set((state) => {
        const filtered = state.connectedWallets.filter(w => !(w.id === wallet.id && w.address === wallet.address))
        return { connectedWallets: [...filtered, wallet] }
    }),
    disconnectWallet: (connectorName) => set((state) => ({
        connectedWallets: connectorName
            ? state.connectedWallets.filter(w => w.id !== connectorName)
            : [],
    })),
}))
