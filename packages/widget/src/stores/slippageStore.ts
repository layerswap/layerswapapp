import { create } from 'zustand'

type SlippageState = {
    slippage: number | undefined
    autoSlippage: boolean
    setSlippage: (value: number | undefined) => void
    setAutoSlippage: (value: boolean) => void
    clearSlippage: () => void
}

export const useSlippageStore = create<SlippageState>()((set) => ({
    slippage: undefined,
    autoSlippage: true,
    setSlippage: (value) => set({ slippage: value }),
    setAutoSlippage: (value) => set({ autoSlippage: value }),
    clearSlippage: () => set({ slippage: undefined, autoSlippage: true })
}))


