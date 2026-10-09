import { create } from 'zustand'

// 'create' → swap couldn't be created with use_gasless (offer switch only).
// 'deposit' → authorize/poll failed after creation (offer retry + switch).
export type GaslessFailureStage = 'create' | 'deposit'

type GaslessPreferenceState = {
    // Scoped to the current swap flow — reset to default when the swap modal closes.
    gaslessEnabled: boolean
    // Transient failure markers — cleared on switch, fresh submit, or toggle.
    gaslessUnavailable: boolean
    gaslessFailureStage: GaslessFailureStage | null
    gaslessErrorMessage: string | null
    setGaslessEnabled: (value: boolean) => void
    reportGaslessUnavailable: (stage: GaslessFailureStage, message?: string | null) => void
    switchToStandardTransfer: () => void
    clearGaslessUnavailable: () => void
    resetGaslessPreference: () => void
}

export const useGaslessPreferenceStore = create<GaslessPreferenceState>()((set) => ({
    gaslessEnabled: true,
    gaslessUnavailable: false,
    gaslessFailureStage: null,
    gaslessErrorMessage: null,
    setGaslessEnabled: (value) => set({ gaslessEnabled: value, gaslessUnavailable: false, gaslessFailureStage: null, gaslessErrorMessage: null }),
    reportGaslessUnavailable: (stage, message) => set({ gaslessUnavailable: true, gaslessFailureStage: stage, gaslessErrorMessage: message ?? null }),
    switchToStandardTransfer: () => set({ gaslessEnabled: false, gaslessUnavailable: false, gaslessFailureStage: null, gaslessErrorMessage: null }),
    clearGaslessUnavailable: () => set({ gaslessUnavailable: false, gaslessFailureStage: null, gaslessErrorMessage: null }),
    resetGaslessPreference: () => set({ gaslessEnabled: true, gaslessUnavailable: false, gaslessFailureStage: null, gaslessErrorMessage: null }),
}))
