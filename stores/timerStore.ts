import { create } from 'zustand'

interface TimerState {
  secondsRemaining: number | undefined
  started: boolean
  intervalId: NodeJS.Timeout | null
  start: (seconds: number) => void
  stop: () => void
  reset: () => void
}

/**
 * Zustand store for countdown timer functionality.
 * Replaces the TimerContext provider pattern.
 * 
 * Usage:
 *   const { started, secondsRemaining, start } = useTimerStore()
 *   // Or with selectors for optimal performance:
 *   const started = useTimerStore(state => state.started)
 */
export const useTimerStore = create<TimerState>()((set, get) => ({
  secondsRemaining: undefined,
  started: false,
  intervalId: null,

  start: (seconds) => {
    // Clear any existing interval
    const { intervalId } = get()
    if (intervalId) {
      clearInterval(intervalId)
    }

    // Set initial state
    set({ secondsRemaining: seconds, started: true })

    // Start the countdown interval
    const newIntervalId = setInterval(() => {
      const { secondsRemaining, started } = get()
      
      if (!started || secondsRemaining === undefined || secondsRemaining <= 0) {
        clearInterval(newIntervalId)
        set({ started: false, intervalId: null })
        return
      }

      const newSeconds = secondsRemaining - 1
      if (newSeconds <= 0) {
        clearInterval(newIntervalId)
        set({ secondsRemaining: 0, started: false, intervalId: null })
      } else {
        set({ secondsRemaining: newSeconds })
      }
    }, 1000)

    set({ intervalId: newIntervalId })
  },

  stop: () => {
    const { intervalId } = get()
    if (intervalId) {
      clearInterval(intervalId)
    }
    set({ started: false, intervalId: null })
  },

  reset: () => {
    const { intervalId } = get()
    if (intervalId) {
      clearInterval(intervalId)
    }
    set({ secondsRemaining: undefined, started: false, intervalId: null })
  },
}))
