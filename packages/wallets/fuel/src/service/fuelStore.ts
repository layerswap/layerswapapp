import { create } from 'zustand'
import type { Fuel, FuelConnector } from '@fuel-ts/account'

export type FuelStoreState = {
    connectors: readonly FuelConnector[]
    fuel: Fuel | undefined
    ready: boolean

    _setConnectors: (connectors: readonly FuelConnector[]) => void
    _setFuel: (fuel: Fuel | undefined) => void
}

export const useFuelStore = create<FuelStoreState>()((set) => ({
    connectors: [],
    fuel: undefined,
    ready: false,

    _setConnectors: (connectors) => set({ connectors, ready: connectors.length > 0 }),
    _setFuel: (fuel) => set({ fuel }),
}))
