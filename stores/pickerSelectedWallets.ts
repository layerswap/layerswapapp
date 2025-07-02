import { create } from 'zustand'

export interface Wallet {
    address: string
    provider: string
}

interface WalletStore {
    sourceWallets: Wallet[] | null
    destWallets: Wallet[] | null
    addSourceWallet: (wallet: Wallet) => void
    addDestWallet: (wallet: Wallet) => void
    reset: () => void
}

const useSelectedWalletStore = create<WalletStore>((set) => ({
    sourceWallets: null,
    destWallets: null,
    addSourceWallet: (wallet) => set((state) => ({ sourceWallets: state.sourceWallets ? [...state.sourceWallets.filter(w => w.provider !== wallet.provider), wallet] : [wallet] })),
    addDestWallet: (wallet) => set((state) => ({ destWallets: state.destWallets ? [...state.destWallets.filter(w => w.provider !== wallet.provider), wallet] : [wallet] })),
    reset: () => set({ sourceWallets: null, destWallets: null }),
}))

export type Direction = 'from' | 'to'

export function usePickerSelectedWalletStore(direction: Direction) {
    const pickerSelectedWallets = useSelectedWalletStore(state =>
        direction === 'from' ? state.sourceWallets : state.destWallets
    )
    const addWallet = useSelectedWalletStore(state =>
        direction === 'from' ? state.addSourceWallet : state.addDestWallet
    )
    return { pickerSelectedWallets, addWallet }
}
