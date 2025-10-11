import { create } from 'zustand'

type RouteTokenSwitchState = {
    showTokens: boolean
    setShowTokens: (val: boolean) => void
}

export const useRouteTokenSwitchStore = create<RouteTokenSwitchState>((set) => ({
    showTokens: false,
    setShowTokens: (val) => set({ showTokens: val }),
}))