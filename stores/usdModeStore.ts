import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type UsdModeState = {
    isUsdMode: boolean
    usdAmount: string
    skipNextSync: boolean
    toggleMode: () => void
    setUsdAmount: (amount: string) => void
    setUsdAmountDirect: (amount: string) => void
    reset: () => void
}

export const useUsdModeStore = create<UsdModeState>()(persist((set) => ({
    isUsdMode: false,
    usdAmount: '',
    skipNextSync: false,
    toggleMode: () => set((state) => ({ isUsdMode: !state.isUsdMode })),
    setUsdAmount: (amount) => set({ usdAmount: amount }),
    setUsdAmountDirect: (amount) => set({ usdAmount: amount, skipNextSync: true }),
    reset: () => set({ isUsdMode: false, usdAmount: '', skipNextSync: false }),
}), {
    name: 'usd-mode',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ isUsdMode: state.isUsdMode }),
}))
