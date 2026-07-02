import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type UsdModeState = {
    isUsdMode: boolean
    usdAmount: string
    toggleMode: () => void
    setUsdAmount: (amount: string) => void
    reset: () => void
}

export const useUsdModeStore = create<UsdModeState>()(persist((set) => ({
    isUsdMode: false,
    usdAmount: '',
    toggleMode: () => set((state) => ({ isUsdMode: !state.isUsdMode })),
    setUsdAmount: (amount) => set({ usdAmount: amount }),
    reset: () => set({ isUsdMode: false, usdAmount: '' }),
}), {
    name: 'usd-mode',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ isUsdMode: state.isUsdMode }),
}))
