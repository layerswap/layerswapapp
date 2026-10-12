import { type Wallet } from '@layerswap/widget-types';
import { create } from 'zustand'
import type { Fuel, FuelConnector } from '@fuel-ts/account'

export type FuelStoreState = {
    connectors: readonly FuelConnector[]
    fuel: Fuel | undefined
    ready: boolean
    connectedWallets: Wallet[]

    _setConnectors: (connectors: readonly FuelConnector[]) => void
    _setFuel: (fuel: Fuel | undefined) => void
    _setConnectedWallets: (wallets: Wallet[]) => void
    connectWallet: (wallet: Wallet) => void
    disconnectWallet: (connectorName?: string) => void
}

export const useFuelStore = create<FuelStoreState>()((set) => ({
    connectors: [],
    fuel: undefined,
    ready: false,
    connectedWallets: [],

    // `fuel.connectors()` returns the SAME array instance on every call and
    // mutates `installed`/`connected` on the connector objects in place. A
    // stored reference would defeat every downstream identity memo — the
    // provider snapshot would never recompute after its first build, freezing
    // stale `extensionNotFound` flags in the UI. Copy on write so every
    // publish is a fresh identity.
    _setConnectors: (connectors) => set({ connectors: [...connectors], ready: connectors.length > 0 }),
    _setFuel: (fuel) => set({ fuel }),
    _setConnectedWallets: (connectedWallets) => set({ connectedWallets }),
    // One entry per connector; its `addresses` list holds all authorized accounts.
    // Reauthorization must replace the old primary address, not keep it selectable.
    connectWallet: (wallet) => set((state) => {
        const index = state.connectedWallets.findIndex(w => w.id === wallet.id)
        const connectedWallets = state.connectedWallets.filter(w => w.id !== wallet.id)
        connectedWallets.splice(index < 0 ? connectedWallets.length : index, 0, wallet)
        return { connectedWallets }
    }),
    disconnectWallet: (connectorName) => set((state) => ({
        connectedWallets: connectorName
            ? state.connectedWallets.filter(w => w.id !== connectorName)
            : [],
    })),
}))
