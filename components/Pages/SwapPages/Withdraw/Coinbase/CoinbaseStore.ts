import { create } from 'zustand'
import { persist } from 'zustand/middleware'
interface CoinbaseState {
    alreadyFamiliar: boolean
    toggleAlreadyFamiliar: () => void
}

export const useCoinbaseStore = create<CoinbaseState>()(persist((set) => ({
    alreadyFamiliar: false,
    toggleAlreadyFamiliar: () => set((state) => ({ alreadyFamiliar: !state.alreadyFamiliar })),
}),
    {
        name: 'coinbase-config-storage'
    }))