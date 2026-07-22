import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Connection, Connector, GetAccountReturnType } from '@wagmi/core'

export type WagmiAccountSnapshot = {
    address?: string
    addresses?: readonly string[]
    connectorId?: string
    connectorName?: string
    chainId?: number
    status: GetAccountReturnType['status']
}

const EMPTY_ACCOUNT: WagmiAccountSnapshot = { status: 'disconnected' }

export type EvmStoreState = {
    wagmiAccount: WagmiAccountSnapshot
    connections: readonly Connection[]
    allConnectors: readonly Connector[]
    selectedAddress?: string
    ready: boolean

    setActiveAddress: (address: string | undefined) => void
    _setWagmiAccount: (snapshot: WagmiAccountSnapshot) => void
    _setConnections: (connections: readonly Connection[]) => void
    _setConnectors: (connectors: readonly Connector[]) => void
}

export const useEvmStore = create<EvmStoreState>()(
    persist(
        (set) => ({
            wagmiAccount: EMPTY_ACCOUNT,
            connections: [],
            allConnectors: [],
            selectedAddress: undefined,
            ready: false,

            setActiveAddress: (address) => set({ selectedAddress: address }),
            _setWagmiAccount: (snapshot) => set({ wagmiAccount: snapshot }),
            _setConnections: (connections) => set({ connections }),
            _setConnectors: (connectors) => set({ allConnectors: connectors, ready: connectors.length > 0 }),
        }),
        {
            name: 'ls-evm-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ selectedAddress: state.selectedAddress }),
        },
    ),
)

export const snapshotFromAccount = (account: GetAccountReturnType): WagmiAccountSnapshot => ({
    address: account.address,
    addresses: account.addresses,
    connectorId: account.connector?.id,
    connectorName: account.connector?.name,
    chainId: account.chainId,
    status: account.status,
})
