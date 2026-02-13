import { create } from 'zustand'

type AmountInputMode = 'token' | 'usd'

type AmountModeState = {
    inputMode: AmountInputMode
    setInputMode: (mode: AmountInputMode) => void
    toggleInputMode: () => void
}

export const useAmountModeStore = create<AmountModeState>()((set) => ({
    inputMode: 'token',
    setInputMode: (mode) => set({ inputMode: mode }),
    toggleInputMode: () => set((state) => ({ inputMode: state.inputMode === 'token' ? 'usd' : 'token' })),
}))
