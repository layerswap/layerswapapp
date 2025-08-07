import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { NetworkBalance } from '../Models/Balance'
import { NetworkWithTokens } from '../Models/Network'
import { BalanceResolver } from '../lib/balances/balanceResolver'

// Reuse your existing key helper or define it here
export const getKey = (address: string, network: NetworkWithTokens) =>
  `${address}:${network.name}`

type Status = 'idle' | 'loading' | 'success' | 'error'
interface BalanceEntry {
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
  // existing state/actions
  balances: Record<string, BalanceEntry>
  lastFetchMap: Record<string, number>
  fetchBalance: (
    address: string,
    network: NetworkWithTokens,
    options?: Options,
  ) => Promise<NetworkBalance>

  // new derived state + initializer
  allBalances: Record<string, NetworkBalance> | null
  isLoading: boolean
  initAllBalances: (
    pairs: Array<{ address: string; network: NetworkWithTokens }>
  ) => void
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
    allBalances: null,
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
                  [key]: { error, status: 'error' },
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
          [key]: { status: 'loading', promise: queuedPromise },
        }
      }))

      return queuedPromise
    },

    initAllBalances: pairs => {
      // reset the derived result
      if (pairs.length > 0)
        set({ isLoading: true })
      set({ allBalances: null })
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
              balances[getKey(address, network)]?.status === 'success'
          )
          if (done) {
            const finalMap = pairs.reduce<Record<string, NetworkBalance>>(
              (acc, { address, network }) => {
                const entry = balances[getKey(address, network)]
                if (entry?.data) acc[network.name] = entry.data
                return acc
              },
              {}
            )
            set({ allBalances: finalMap })
            set({ isLoading: false })
            unsub()  // cleanup subscription
          }
        }
      )
    }
  }))
)
