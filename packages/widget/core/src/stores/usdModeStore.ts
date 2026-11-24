import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { browserOnlyMiddleware } from '@layerswap/utils/common'

type UsdModeState = {
    isUsdMode: boolean
    usdAmount: string
    toggleMode: () => void
    setUsdAmount: (amount: string) => void
    reset: () => void
}

export const useUsdModeStore = create<UsdModeState>()(browserOnlyMiddleware(persist)((set) => ({
    isUsdMode: false,
    usdAmount: '',
    toggleMode: () => set((state) => ({ isUsdMode: !state.isUsdMode })),
    setUsdAmount: (amount) => set({ usdAmount: amount }),
    reset: () => set({ isUsdMode: false, usdAmount: '' }),
}), {
    name: 'usd-mode',
    storage: createJSONStorage(() => window.localStorage),
    partialize: (state) => ({ isUsdMode: state.isUsdMode }),
}))
