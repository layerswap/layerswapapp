import { create } from 'zustand'

export type TronWalletState = 'NotFound' | 'Disconnect' | 'Connected' | 'Loading' | string

/**
 * Local duck-typed shape for a Tron wallet adapter. We deliberately avoid
 * importing `Adapter` from `@tronweb3/tronwallet-abstract-adapter`, since each
 * concrete adapter package (tronlink, okxwallet, bybit, …) ships its own
 * version with subtly incompatible declarations of optional members like
 * `multiSign`. This interface captures only what the manager actually uses.
 */
export type TronTransaction = any
export type TronSignedTransaction = any
export interface TronAdapter {
    name: string
    icon: string
    url: string
    state: TronWalletState
    address: string | null
    connected: boolean
    connect(options?: Record<string, unknown>): Promise<void>
    disconnect(): Promise<void>
    signTransaction(transaction: TronTransaction): Promise<TronSignedTransaction>
    on(event: 'connect', listener: (address: string) => void): unknown
    on(event: 'disconnect', listener: () => void): unknown
    on(event: 'accountsChanged', listener: (address: string) => void): unknown
    on(event: 'stateChanged', listener: (state: TronWalletState) => void): unknown
    on(event: 'readyStateChanged', listener: (state: string) => void): unknown
    off(event: 'connect', listener: (address: string) => void): unknown
    off(event: 'disconnect', listener: () => void): unknown
    off(event: 'accountsChanged', listener: (address: string) => void): unknown
    off(event: 'stateChanged', listener: (state: TronWalletState) => void): unknown
    off(event: 'readyStateChanged', listener: (state: string) => void): unknown
}

export type TronWalletSnapshot = {
    name: string
    icon: string
    url?: string
    state: TronWalletState
    connected: boolean
    address?: string
}

export type TronStoreState = {
    wallets: readonly TronWalletSnapshot[]
    activeWalletName: string | undefined
    activeAddress: string | undefined
    ready: boolean

    _setWallets: (wallets: readonly TronWalletSnapshot[]) => void
    _setActive: (name: string | undefined, address: string | undefined) => void
}

export const useTronStore = create<TronStoreState>()((set) => ({
    wallets: [],
    activeWalletName: undefined,
    activeAddress: undefined,
    ready: false,

    _setWallets: (wallets) => set({ wallets, ready: true }),
    _setActive: (name, address) => set({ activeWalletName: name, activeAddress: address }),
}))

export const snapshotFromTronAdapter = (adapter: TronAdapter): TronWalletSnapshot => ({
    name: adapter.name,
    icon: adapter.icon,
    url: adapter.url,
    state: adapter.state,
    connected: adapter.connected,
    address: adapter.address || undefined,
})
