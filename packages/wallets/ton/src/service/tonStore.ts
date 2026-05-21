import { create } from 'zustand'
import type { Wallet as TonWalletInfo } from '@tonconnect/ui-react'

export type TonWalletSnapshot = {
    address?: string
    appName?: string
    walletName?: string
    imageUrl?: string
}

export type TonStoreState = {
    tonWallet: TonWalletSnapshot | undefined
    ready: boolean

    _setTonWallet: (snapshot: TonWalletSnapshot | undefined) => void
    _setReady: (ready: boolean) => void
}

export const useTonStore = create<TonStoreState>()((set) => ({
    tonWallet: undefined,
    ready: false,

    _setTonWallet: (snapshot) => set({ tonWallet: snapshot }),
    _setReady: (ready) => set({ ready }),
}))

export const snapshotFromTonWallet = (wallet: TonWalletInfo | null): TonWalletSnapshot | undefined => {
    if (!wallet) return undefined
    const w = wallet as TonWalletInfo & { name?: string; imageUrl?: string }
    return {
        address: wallet.account?.address,
        appName: wallet.device?.appName,
        walletName: w.name,
        imageUrl: w.imageUrl,
    }
}
