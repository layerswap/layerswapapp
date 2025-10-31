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
interface BalanceEntry {
  data?: NetworkBalance
  error?: unknown
  status: Status
  promise?: Promise<NetworkBalance>
}

type Options = {
  dedupeInterval?: number,
  ignoreCache?: boolean,
  timeoutMs?: number,
  retryCount?: number
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
  balanceKeysForSorting: Record<string, string> | null
  sortingDataIsLoading: boolean
  partialPublished: boolean
  startTimeOfInit?: number
  initSortingBalances: (
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
    balanceKeysForSorting: {},
    initiatedBalances: null,
    sortingDataIsLoading: false,
    partialPublished: false,
    startTimeOfInit: undefined,
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
          balanceFetcher.getBalance(network, address, { timeoutMs: options?.timeoutMs, retryCount: options?.retryCount })
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

    initSortingBalances: pairs => {
      const initiatedBalances = pairs.reduce<Record<string, string>>(
        (acc, { address, network }) => {
          const key = getKey(address, network)
          acc[network.name] = key
          return acc
        }, {})
      const sortedpairs = pairs.sort((a, b) => Number(a.network.source_rank) - Number(b.network.source_rank))
      sortedpairs.forEach(({ address, network }) => {
        get().fetchBalance(address, network, { dedupeInterval: 120_000, ignoreCache: false, timeoutMs: 4500, retryCount: 0 })
      })

      set({ sortingDataIsLoading: true })
      set({ initiatedBalances })
      set({ startTimeOfInit: Date.now() })
      set({ partialPublished: false })

      api.subscribe(
        state => state.balances,
        balances => {

          const keysArray = Object.entries(get().initiatedBalances || {})
          const done = keysArray.every(
            ([_, key]) =>
              balances[key].data
          )
          if (done) {
            set({ sortingDataIsLoading: false })
            set({ balanceKeysForSorting: get().initiatedBalances })
            set({ partialPublished: false })
          } else {

            const startedAt = get().startTimeOfInit ?? 0
            const elapsed = Date.now() - startedAt
            if (!get().partialPublished && elapsed >= 4500) {
              const partial: Record<string, string> = {}
              keysArray.forEach(([networkName, key]) => {
                if (balances[key]?.data) {
                  partial[networkName] = key
                }
              })
              console.log("**partial", partial)
              set({ balanceKeysForSorting: partial })
              set({ partialPublished: true })
              set({ sortingDataIsLoading: false })
            }
          }
        },
        { fireImmediately: true }
      )
    }
  }))
)

export const selectResolvedSortingBalances = (state: BalanceStore) => {
  const keys = state.balanceKeysForSorting
  if (!keys) return null
  const keysArray = Object.entries(keys)

  const balanceData = keysArray.reduce<Record<string, NetworkBalance>>((acc, [networkName, key]) => {
    const entry = state.balances[key]
    if (entry?.data) acc[networkName] = entry.data
    return acc
  }, {})

  return balanceData
}
