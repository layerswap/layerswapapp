import { create } from 'zustand'
import type { Fuel, FuelConnector } from '@fuel-ts/account'
import type { Wallet } from "@layerswap/wallet-core/types"

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

    // `fuel.connectors()` returns the SAME array instance on every call and
    // mutates `installed`/`connected` on the connector objects in place. A
    // stored reference would defeat every downstream identity memo — the
    // provider snapshot would never recompute after its first build, freezing
    // stale `extensionNotFound` flags in the UI. Copy on write so every
    // publish is a fresh identity.
    _setConnectors: (connectors) => set({ connectors: [...connectors], ready: connectors.length > 0 }),
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
