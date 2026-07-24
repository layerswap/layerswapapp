import { create } from 'zustand'
import type { GetAccountReturnType, Connector } from '@bigmi/client'
import type { InternalConnector } from '@layerswap/widget/types'

export type BitcoinAccountSnapshot = {
    address?: string
    connectorId?: string
    connectorName?: string
    connectorIcon?: string
    status: GetAccountReturnType['status']
}

const EMPTY_ACCOUNT: BitcoinAccountSnapshot = { status: 'disconnected' }

export type BitcoinStoreState = {
    account: BitcoinAccountSnapshot
    allConnectors: readonly Connector[]
    resolvedConnectors: readonly InternalConnector[]
    ready: boolean

    _setAccount: (snapshot: BitcoinAccountSnapshot) => void
    _setAllConnectors: (connectors: readonly Connector[]) => void
    _setResolvedConnectors: (connectors: readonly InternalConnector[]) => void
}

export const useBitcoinStore = create<BitcoinStoreState>()((set) => ({
    account: EMPTY_ACCOUNT,
    allConnectors: [],
    resolvedConnectors: [],
    ready: false,

    _setAccount: (snapshot) => set({ account: snapshot }),
    _setAllConnectors: (connectors) => set({ allConnectors: connectors }),
    _setResolvedConnectors: (connectors) => set({ resolvedConnectors: connectors, ready: connectors.length > 0 }),
}))

export const snapshotFromBitcoinAccount = (account: GetAccountReturnType): BitcoinAccountSnapshot => ({
    address: account.account?.address,
    connectorId: account.connector?.id,
    connectorName: account.connector?.name,
    connectorIcon: account.connector?.icon,
    status: account.status,
})
