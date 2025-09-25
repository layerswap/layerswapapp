import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { NetworkBalance } from '../Models/Balance'
import { NetworkWithTokens } from '../Models/Network'
import { BalanceResolver } from '../lib/balances/balanceResolver'

export function getKey(address: string, network: NetworkWithTokens): string
export function getKey(address: string, networkName: string): string
export function getKey(address: string, networkOrName: NetworkWithTokens | string): string {
  const name = typeof networkOrName === 'string' ? networkOrName : networkOrName.name
  return `${address}:${name}`
}

type Status = 'loading' | 'success' | 'error'
export interface BalanceEntry {
  data?: NetworkBalance
  error?: unknown
  status: Status
  promise?: Promise<NetworkBalance>
}

type Options = {
  dedupeInterval?: number,
  ignoreCache?: boolean
}

interface BalanceStore {
  balances: Record<string, BalanceEntry>
  lastFetchMap: Record<string, number>
  fetchBalance: (
    address: string,
    network: NetworkWithTokens,
    options?: Options,
  ) => Promise<NetworkBalance>

  initiatedBalances: Record<string, string> | null
  isLoading: boolean
  initAllBalances: (
    pairs: Array<{ address: string; network: NetworkWithTokens }>
  ) => void

  getResolvedInitiatedBalances: () => Record<string, NetworkBalance> | null
}

const balanceFetcher = new BalanceResolver()
const MAX_CONCURRENT = 500
let activeCount = 0
const queue: Array<() => void> = []
function processQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!
    activeCount++
    job()
  }
}

export const useBalanceStore = create<BalanceStore>()(
  subscribeWithSelector((set, get, api) => ({
    balances: {},
    lastFetchMap: {},
    initiatedBalances: null,
    isLoading: false,
    fetchBalance: (address, network, options) => {
      const key = getKey(address, network)
      const entry = get().balances[key]
      const dedupeInterval = options?.dedupeInterval ?? 120_000
      const now = Date.now()
      const last = get().lastFetchMap[key] ?? 0

      if (entry?.promise) return entry.promise
      if (!options?.ignoreCache && entry && now - last < dedupeInterval) return Promise.resolve(entry.data!)

      const queuedPromise = new Promise<NetworkBalance>((resolve, reject) => {
        const job = () => {
          balanceFetcher.getBalance(network, address)
            .then(data => {
              set(state => ({
                balances: {
                  ...state.balances,
                  [key]: { data, status: 'success' },
                },
                lastFetchMap: {
                  ...state.lastFetchMap,
                  [key]: Date.now(),
                }
              }))
              resolve(data)
            })
            .catch(error => {
              set(state => ({
                balances: {
                  ...state.balances,
                  [key]: { ...state.balances[key], error, status: 'error' },
                },
                lastFetchMap: {
                  ...state.lastFetchMap,
                  [key]: Date.now(),
                }
              }))
              reject(error)
            })
            .finally(() => {
              activeCount--
              processQueue()
            })
        }

        queue.push(job)
        processQueue()
      })

      set(state => ({
        balances: {
          ...state.balances,
          [key]: { ...state.balances[key], status: 'loading', promise: queuedPromise },
        }
      }))

      return queuedPromise
    },

    initAllBalances: pairs => {
      if (pairs.length > 0)
        set({ isLoading: true })
      set({ initiatedBalances: null })
      // kick off every fetch
      pairs.forEach(({ address, network }) => {
        get().fetchBalance(address, network, { dedupeInterval: 120_000, ignoreCache: true })
      })

      // subscribe to balance map changes
      const unsub = api.subscribe(
        state => state.balances,
        balances => {
          const done = pairs.every(
            ({ address, network }) =>
              balances[getKey(address, network)]?.status !== 'loading'
          )
          if (done) {
            const finalMap = pairs.reduce<Record<string, string>>(
              (acc, { address, network }) => {
                const key = getKey(address, network)
                const entry = balances[key]
                if (entry) acc[network.name] = key
                return acc
              },
              {}
            )
            set({ initiatedBalances: finalMap })
            set({ isLoading: false })
            unsub()  // cleanup subscription
          }
        }
      )
    },

    getResolvedInitiatedBalances: () => {
      const keys = get().initiatedBalances
      if (!keys) return null
      const balances = get().balances
      return Object.entries(keys).reduce<Record<string, NetworkBalance>>((acc, [networkName, key]) => {
        const entry = balances[key]
        if (entry?.data) acc[networkName] = entry.data
        return acc
      }, {})
    }
  }))
)

// Memoized selector to prevent unnecessary object creation
let lastInitiatedBalances: Record<string, string> | null = null
let lastBalances: Record<string, any> = {}
let memoizedResult: Record<string, NetworkBalance> | null = null


//Discuss with Babken M.
export const selectResolvedInitiatedBalances = (state: BalanceStore) => {
  const keys = state.initiatedBalances
  if (!keys) return null

  // Only recalculate if initiatedBalances or balances have actually changed
  if (keys === lastInitiatedBalances && state.balances === lastBalances && memoizedResult) {
    return memoizedResult
  }

  // Check if the actual data has changed, not just the object references
  if (lastInitiatedBalances && memoizedResult) {
    let hasChanged = false

    // Check if keys are different
    const currentKeySet = Object.keys(keys)
    const lastKeySet = Object.keys(lastInitiatedBalances)

    if (currentKeySet.length !== lastKeySet.length ||
        !currentKeySet.every(k => lastKeySet.includes(k))) {
      hasChanged = true
    }

    // Check if balance data has changed for existing keys
    if (!hasChanged) {
      for (const [_, key] of Object.entries(keys)) {
        const entry = state.balances[key]
        const lastEntry = lastBalances[key]
        if (entry?.data !== lastEntry?.data) {
          hasChanged = true
          break
        }
      }
    }

    if (!hasChanged) {
      return memoizedResult
    }
  }

  // Recalculate the result
  const result = Object.entries(keys).reduce<Record<string, NetworkBalance>>((acc, [networkName, key]) => {
    const entry = state.balances[key]
    if (entry?.data) acc[networkName] = entry.data
    return acc
  }, {})

  // Update memoization cache
  lastInitiatedBalances = keys
  lastBalances = state.balances
  memoizedResult = result

  return result
}
