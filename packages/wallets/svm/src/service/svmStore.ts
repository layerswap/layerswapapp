import { create } from 'zustand'
import type { Adapter, WalletReadyState } from '@solana/wallet-adapter-base'

export type SvmWalletSnapshot = {
    name: string
    icon: string
    url?: string
    readyState: WalletReadyState
    connected: boolean
    address?: string
}

export type SvmStoreState = {
    wallets: readonly SvmWalletSnapshot[]
    activeWalletName: string | undefined
    activeAddress: string | undefined
    ready: boolean

    _setWallets: (wallets: readonly SvmWalletSnapshot[]) => void
    _setActive: (name: string | undefined, address: string | undefined) => void
}

export const useSvmStore = create<SvmStoreState>()((set) => ({
    wallets: [],
    activeWalletName: undefined,
    activeAddress: undefined,
    ready: false,

    _setWallets: (wallets) => set({ wallets, ready: wallets.length > 0 }),
    _setActive: (name, address) => set({ activeWalletName: name, activeAddress: address }),
}))

export const snapshotFromSvmAdapter = (adapter: Adapter): SvmWalletSnapshot => ({
    name: adapter.name,
    icon: adapter.icon,
    url: adapter.url,
    readyState: adapter.readyState,
    connected: adapter.connected,
    address: adapter.publicKey?.toBase58(),
})
