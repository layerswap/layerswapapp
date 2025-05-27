import { create } from 'zustand'
import { NetworkBalance } from '../Models/Balance'
import { NetworkWithTokens } from '../Models/Network'
import { BalanceResolver } from '../lib/balances/balanceResolver'
import { DateTime } from 'fuels'


type Status = 'idle' | 'loading' | 'success' | 'error'
const balanceFetcher = new BalanceResolver()
interface BalanceEntry {
  data?: NetworkBalance
  error?: unknown
  status: Status
  promise?: Promise<NetworkBalance>
}
type Options = {
  dedupeInterval?: number,
}
interface BalanceStore {
  balances: Record<string, BalanceEntry>
  fetchBalance: (
    address: string,
    network: NetworkWithTokens,
    options?: Options
  ) => Promise<NetworkBalance>
  lastFetchMap: Record<string, number>
  getAllBalances: () => ({ network: string, address: string } & BalanceEntry)[]
}

export const useBalanceStore = create<BalanceStore>((set, get) => ({
  balances: {},
  lastFetchMap: {},
  fetchBalance: async (address: string, network: NetworkWithTokens, options: Options) => {
    const key = getKey(address, network)
    const entry = get().balances[key]
    const {
      dedupeInterval = 200000,
    } = options ?? {}

    if (entry?.promise) {
      return entry.promise
    }

    const now = Date.now()
    const last = get().lastFetchMap?.[key] ?? 0
    if (entry && (dedupeInterval > 0 && now - last < dedupeInterval))
      return entry

    const promise = balanceFetcher.getBalance(network, address)
      .then((data) => {
        set((state) => ({
          balances: {
            ...state.balances,
            [key]: { data, status: 'success' },
          },
          lastFetchMap: {
            ...state.lastFetchMap,
            [key]: DateTime.now()
          }
        }))
        return data
      })
      .catch((error) => {
        set((state) => ({
          balances: {
            ...state.balances,
            [key]: { error, status: 'error' },
          },
          lastFetchMap: {
            ...state.lastFetchMap,
            [key]: DateTime.now()
          }
        }))
        throw error
      })

    set((state) => ({
      balances: {
        ...state.balances,
        [key]: { status: 'loading', promise },
      },
    }))

    return promise
  },

  getAllBalances: () => {
    const balances = get().balances
    return Object.keys(balances)
      .filter((k) => balances[k].status !== 'loading')
      .map((key) => {
        const [address, network] = getAddressAndNetwork(key)
        return ({ ...balances[key], address, network })
      })
  }
}))
export const getKey = (address: string, network: NetworkWithTokens) => `${address}:${network.name}`
const getAddressAndNetwork = (key: string) => key.split(":")