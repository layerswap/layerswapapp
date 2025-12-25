import { create } from 'zustand'

type SlippageState = {
    slippage: number | undefined
    setSlippage: (value: number | undefined) => void
    clearSlippage: () => void
}

export const useSlippageStore = create<SlippageState>()((set) => ({
    slippage: undefined,
    setSlippage: (value) => set({ slippage: value }),
    clearSlippage: () => set({ slippage: undefined })
}))


