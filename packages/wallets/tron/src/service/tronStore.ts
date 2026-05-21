import { create } from 'zustand'
import type { Wallet as TronWallet } from '@tronweb3/tronwallet-adapter-react-hooks'

export type TronWalletState = 'NotFound' | 'Disconnect' | 'Connected' | 'Loading' | string

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

    _setWallets: (wallets) => set({ wallets, ready: wallets.length > 0 }),
    _setActive: (name, address) => set({ activeWalletName: name, activeAddress: address }),
}))

export const snapshotFromTronWallet = (wallet: TronWallet): TronWalletSnapshot => ({
    name: wallet.adapter.name,
    icon: wallet.adapter.icon,
    url: wallet.adapter.url,
    state: wallet.state,
    connected: wallet.adapter.connected,
    address: wallet.adapter.address || undefined,
})
