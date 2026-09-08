import { create } from 'zustand'
import type { Wallet as TonWallet, WalletInfo } from '@tonconnect/sdk'

export type TonWalletSnapshot = {
    address?: string
    appName?: string
    walletName?: string
    imageUrl?: string
}

export type TonStoreState = {
    tonWallet: TonWalletSnapshot | undefined
    wallets: readonly WalletInfo[]
    ready: boolean

    _setTonWallet: (snapshot: TonWalletSnapshot | undefined) => void
    _setWallets: (wallets: readonly WalletInfo[]) => void
    _setReady: (ready: boolean) => void
}

export const useTonStore = create<TonStoreState>()((set) => ({
    tonWallet: undefined,
    wallets: [],
    ready: false,

    _setTonWallet: (snapshot) => set({ tonWallet: snapshot }),
    _setWallets: (wallets) => set({ wallets }),
    _setReady: (ready) => set({ ready }),
}))

export const snapshotFromTonWallet = (wallet: TonWallet | null): TonWalletSnapshot | undefined => {
    if (!wallet) return undefined
    const w = wallet as TonWallet & { name?: string; imageUrl?: string }
    return {
        address: wallet.account?.address,
        appName: wallet.device?.appName,
        walletName: w.name,
        imageUrl: w.imageUrl,
    }
}
