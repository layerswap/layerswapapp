import { createStore } from 'zustand/vanilla'

export type StellarWalletSnapshot = {
    id: string
    name: string
    type: string
    isAvailable: boolean
    isPlatformWrapper: boolean
    icon: string
    url: string
}

export type StellarStoreState = {
    wallets: readonly StellarWalletSnapshot[]
    activeWalletId: string | undefined
    activeAddress: string | undefined
    networkPassphrase: string | undefined
    ready: boolean
    error: string | undefined
    setWallets(wallets: readonly StellarWalletSnapshot[]): void
    setActive(walletId: string | undefined, address: string | undefined): void
    setNetworkPassphrase(networkPassphrase: string | undefined): void
    setInitializing(): void
    setReady(error?: string): void
}

export const stellarStore = createStore<StellarStoreState>()((set) => ({
    wallets: [],
    activeWalletId: undefined,
    activeAddress: undefined,
    networkPassphrase: undefined,
    ready: false,
    error: undefined,
    setWallets: wallets => set({ wallets }),
    setActive: (activeWalletId, activeAddress) => set({ activeWalletId, activeAddress }),
    setNetworkPassphrase: networkPassphrase => set({ networkPassphrase }),
    setInitializing: () => set({ ready: false, error: undefined }),
    setReady: error => set({ ready: true, error }),
}))
