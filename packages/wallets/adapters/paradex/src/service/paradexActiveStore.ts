import { create } from 'zustand'

export type ParadexProviderName = 'Starknet' | 'EVM'

export type ParadexAccount = {
    id: string
    l1Address: string
    providerName: ParadexProviderName
}

export type ParadexActiveStoreState = {
    selectedAccount?: ParadexAccount
    setSelectedAccount: (account: ParadexAccount | undefined) => void
}

export const useParadexActiveStore = create<ParadexActiveStoreState>()((set) => ({
    selectedAccount: undefined,
    setSelectedAccount: (account) => set({ selectedAccount: account }),
}))
