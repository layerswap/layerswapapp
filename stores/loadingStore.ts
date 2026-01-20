import { create } from 'zustand'

type Registration = {
  started?: boolean
  ended?: boolean
}

interface LoadingState {
  registrations: Record<string, Registration>
  start: (name: string) => void
  end: (name: string) => void
  isLoading: boolean
}

/**
 * Zustand store for tracking loading states across the app.
 * Replaces the LoadingContext provider pattern.
 * 
 * Usage:
 *   const start = useLoadingStore(state => state.start)
 *   const isLoading = useLoadingStore(state => state.isLoading)
 */
export const useLoadingStore = create<LoadingState>()((set) => ({
  registrations: {},
  isLoading: false,
  
  start: (name) => set((state) => {
    const newRegistrations: Record<string, Registration> = { 
      ...state.registrations, 
      [name]: { started: true } 
    }
    const isLoading = Object.values(newRegistrations).some(r => r.started && !r.ended)
    return { registrations: newRegistrations, isLoading }
  }),
  
  end: (name) => set((state) => {
    const newRegistrations: Record<string, Registration> = { 
      ...state.registrations, 
      [name]: { ended: true } 
    }
    const isLoading = Object.values(newRegistrations).some(r => r.started && !r.ended)
    return { registrations: newRegistrations, isLoading }
  }),
}))
