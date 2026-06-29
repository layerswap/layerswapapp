import { create } from 'zustand'

type GaslessPreferenceState = {
    gaslessEnabled: boolean
    // Set when a gasless attempt fails (create or sign/authorize). Transient — drives the
    // "gasless unavailable, switch to standard transfer" prompt and is cleared on switch
    // or when the user manually toggles the preference.
    gaslessUnavailable: boolean
    setGaslessEnabled: (value: boolean) => void
    reportGaslessUnavailable: () => void
    switchToStandardTransfer: () => void
    clearGaslessUnavailable: () => void
}

export const useGaslessPreferenceStore = create<GaslessPreferenceState>()((set) => ({
    gaslessEnabled: true,
    gaslessUnavailable: false,
    setGaslessEnabled: (value) => set({ gaslessEnabled: value, gaslessUnavailable: false }),
    reportGaslessUnavailable: () => set({ gaslessUnavailable: true }),
    switchToStandardTransfer: () => set({ gaslessEnabled: false, gaslessUnavailable: false }),
    clearGaslessUnavailable: () => set({ gaslessUnavailable: false }),
}))
