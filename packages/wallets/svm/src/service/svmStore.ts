import { create } from 'zustand'
import type { Adapter, WalletReadyState } from '@solana/wallet-adapter-base'
import type { Wallet as SvmWallet } from '@solana/wallet-adapter-react'
import type { WalletConnectWalletBase } from '@layerswap/widget/internal'

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
    registryConnectors: readonly WalletConnectWalletBase[]
    ready: boolean

    _setWallets: (wallets: readonly SvmWalletSnapshot[]) => void
    _setActive: (name: string | undefined, address: string | undefined) => void
    _setRegistryConnectors: (connectors: readonly WalletConnectWalletBase[]) => void
}

export const useSvmStore = create<SvmStoreState>()((set) => ({
    wallets: [],
    activeWalletName: undefined,
    activeAddress: undefined,
    registryConnectors: [],
    ready: false,

    _setWallets: (wallets) => set({ wallets, ready: wallets.length > 0 }),
    _setActive: (name, address) => set({ activeWalletName: name, activeAddress: address }),
    _setRegistryConnectors: (connectors) => set({ registryConnectors: connectors }),
}))

export const snapshotFromSvmWallet = (wallet: SvmWallet): SvmWalletSnapshot => ({
    name: wallet.adapter.name,
    icon: wallet.adapter.icon,
    url: wallet.adapter.url,
    readyState: wallet.readyState,
    connected: wallet.adapter.connected,
    address: wallet.adapter.publicKey?.toBase58(),
})
