import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { NetworkBalance } from '@layerswap/widget-types';
import { NetworkWithTokens } from '@layerswap/widget-types';
import { resolverService } from '../lib/resolvers/resolverService'
import type { BalanceFetchPolicy, BalanceResult } from '../lib/balances/balanceResolver'

export function getKey(address: string, network: NetworkWithTokens): string
export function getKey(address: string, networkName: string): string
export function getKey(address: string, networkOrName: NetworkWithTokens | string): string {
  const name = typeof networkOrName === 'string' ? networkOrName : networkOrName.name
  return `${address}:${name}`
}

type Status = 'loading' | 'success' | 'error' | 'unavailable'

type BalanceRequest = {
  address: string
  network: NetworkWithTokens
  policy: BalanceFetchPolicy
}
export interface BalanceEntry {
  data?: NetworkBalance
  error?: unknown
  status: Status
  promise?: Promise<NetworkBalance>
  request?: BalanceRequest
  providerRevision?: number
}

type Options = BalanceFetchPolicy & {
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
  balanceKeysForSorting: Record<string, string> | null
  sortingDataIsLoading: boolean
  partialPublished: boolean
  startTimeOfInit?: number
  sortingTimerId?: ReturnType<typeof setTimeout>
  sortingUnsubscribe?: () => void
  initSortingBalances: (
    pairs: Array<{ address: string; network: NetworkWithTokens }>
  ) => void
  cleanupSortingBalances: () => void
  revalidateUnavailable: () => void
}

// balanceFetcher is now accessed through resolverService
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
  subscribeWithSelector((set, get, api) => {
    const waitingForProvider = new Set<string>()

    const revalidateKey = (key: string) => {
      const entry = get().balances[key]
      const snapshot = resolverService.getBalanceSnapshot()
      if (entry?.status !== 'unavailable' || !entry.request) {
        waitingForProvider.delete(key)
        return
      }
      if (entry.providerRevision === snapshot.revision) return
      const { address, network, policy } = entry.request
      // The normal request path owns provider selection and its error boundary.
      get().fetchBalance(address, network, { ...policy, ignoreCache: true }).catch(() => { })
    }

    return {
      balances: {},
      lastFetchMap: {},
      balanceKeysForSorting: {},
      initiatedBalances: null,
      sortingDataIsLoading: false,
      partialPublished: false,
      startTimeOfInit: undefined,
      sortingTimerId: undefined,
      sortingUnsubscribe: undefined,

      cleanupSortingBalances: () => {
        const { sortingTimerId, sortingUnsubscribe } = get()
        if (sortingTimerId) {
          clearTimeout(sortingTimerId)
          set({ sortingTimerId: undefined })
        }
        if (sortingUnsubscribe) {
          sortingUnsubscribe()
          set({ sortingUnsubscribe: undefined })
        }
      },

      fetchBalance: (address, network, options) => {
        const key = getKey(address, network)
        const entry = get().balances[key]
        const dedupeInterval = options?.dedupeInterval ?? 120_000
        const now = Date.now()
        const last = get().lastFetchMap[key] ?? 0

        if (entry?.promise) return entry.promise
        // A cached failure stays a failure; the timestamp doubles as retry backoff.
        if (!options?.ignoreCache && entry && now - last < dedupeInterval)
          return entry.status === 'error' ? Promise.reject(entry.error) : Promise.resolve(entry.data!)

        // Only a new attempt establishes its policy. Cache hits and callers joining
        // an in-flight promise must not replace the request that will be resumed.
        const request: BalanceRequest = {
          address,
          network,
          policy: { timeoutMs: options?.timeoutMs, retryCount: options?.retryCount },
        }
        waitingForProvider.delete(key)

        const execute = async (): Promise<NetworkBalance> => {
          // Capture at execution time, so queued jobs use the latest providers.
          const snapshot = resolverService.getBalanceSnapshot()
          let result: BalanceResult
          try {
            result = snapshot.resolver
              ? await snapshot.resolver.resolveBalance(network, address, request.policy)
              : { kind: 'unavailable' }
          } catch (error) {
            result = { kind: 'failed', error }
          }

          if (result.kind === 'unavailable') waitingForProvider.add(key)
          const data = result.kind === 'resolved' ? result.data : { balances: [] }
          const completed: BalanceEntry = result.kind === 'failed'
            ? { status: 'error', error: result.error, data: get().balances[key]?.data }
            : { status: result.kind === 'resolved' ? 'success' : 'unavailable', data }
          set(state => ({
            balances: {
              ...state.balances,
              [key]: { ...completed, request, providerRevision: snapshot.revision },
            },
            lastFetchMap: { ...state.lastFetchMap, [key]: Date.now() },
          }))

          // Registration may have happened while this attempt was pending. Only
          // this key needs another attempt, and only for a newer revision.
          if (result.kind === 'unavailable') revalidateKey(key)
          if (result.kind === 'failed') throw result.error
          return data
        }

        const queuedPromise = new Promise<NetworkBalance>((resolve, reject) => {
          queue.push(() => {
            // Defer execution until the entry owns its promise. The terminal catch
            // also owns errors from queue cleanup; no background chain is detached.
            void Promise.resolve().then(execute).then(resolve, reject).finally(() => {
              activeCount--
              processQueue()
            }).catch(reject)
          })
          processQueue()
        })

        set(state => ({
          balances: {
            ...state.balances,
            [key]: { ...state.balances[key], request, status: 'loading', promise: queuedPromise },
          }
        }))

        return queuedPromise
      },

      revalidateUnavailable: () => {
        // Starting a request removes it from the set; iterate a snapshot.
        for (const key of [...waitingForProvider]) revalidateKey(key)
      },

      initSortingBalances: pairs => {

        get().cleanupSortingBalances()

        // Setup initiated balances and start fetches
        const initiatedBalances = pairs.reduce<Record<string, string>>(
          (acc, { address, network }) => {
            const key = getKey(address, network)
            acc[network.name] = key
            return acc
          }, {})
        const sortedpairs = pairs.sort((a, b) => Number(a.network.source_rank) - Number(b.network.source_rank))
        sortedpairs.forEach(({ address, network }) => {
          // Failures surface through the entry's `error`.
          get().fetchBalance(address, network, { dedupeInterval: 120_000, ignoreCache: false, retryCount: 0 }).catch(() => { })
        })

        set({ sortingDataIsLoading: true })
        set({ initiatedBalances })
        set({ startTimeOfInit: Date.now() })
        set({ partialPublished: false })

        // Active timer - fires at 1.5 seconds
        const timerId = setTimeout(() => {
          const state = get()
          // Only publish if not already published and still loading
          if (!state.partialPublished && state.sortingDataIsLoading) {
            const partial: Record<string, string> = {}
            const balances = state.balances
            Object.entries(state.initiatedBalances || {}).forEach(([networkName, key]) => {
              if (balances[key]?.data) {
                partial[networkName] = key
              }
            })
            set({ balanceKeysForSorting: partial })
            set({ partialPublished: true })
          }
        }, 1500)

        set({ sortingTimerId: timerId })

        //Subscribe for completion detection
        const unsubscribe = api.subscribe(
          state => state.balances,
          balances => {
            const keysArray = Object.entries(get().initiatedBalances || {})
            const done = keysArray.every(([_, key]) => balances[key] && balances[key].status !== 'loading')

            if (done) {
              // All complete - cleanup and finalize
              get().cleanupSortingBalances()
              set({ sortingDataIsLoading: false })
              set({ balanceKeysForSorting: get().initiatedBalances })
              set({ partialPublished: false }) // Reset for next time
            }
          },
          { fireImmediately: true }
        )

        set({ sortingUnsubscribe: unsubscribe })
      }
    }
  })
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

// Deferred: the first setProviders runs during render, where store updates
// would update other components mid-render.
let revalidationScheduled = false
resolverService.onProvidersChange(() => {
  if (revalidationScheduled) return
  revalidationScheduled = true
  queueMicrotask(() => {
    revalidationScheduled = false
    useBalanceStore.getState().revalidateUnavailable()
  })
})
