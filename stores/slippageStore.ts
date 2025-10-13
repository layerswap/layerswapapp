import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type SlippageState = {
    slippage: number | undefined
    setSlippage: (value: number | undefined) => void
    clearSlippage: () => void
}

export const useSlippageStore = create<SlippageState>()(persist((set) => ({
    slippage: undefined,
    setSlippage: (value) => set({ slippage: value }),
    clearSlippage: () => set({ slippage: undefined })
}), {
    name: 'ls-slippage',
    storage: createJSONStorage(() => sessionStorage)
}))


