import { create } from 'zustand'

export type TokenBalance = {
    network: string
    amount: number
    decimals: number
    isNativeCurrency: boolean
    token: string
    request_time: string
}

export type NetworkBalance = {
    balances?: TokenBalance[] | null;
    totalInUSD?: number;
    success: boolean;
}

type BalanceStore = {
    balances: Record<string, NetworkBalance> // network -> balance
    requested: Set<string>                   // network names that were fetched
    setNetwrkBalanceIsLoading: (network: string) => void
    setNetworkBalance: (network: string, balance: NetworkBalance) => void
    getNetworkBalance: (network: string) => NetworkBalance | undefined
    areAllBalancesFetched: (networks: string[]) => boolean
}

export const useNetworksBalanceStore = create<BalanceStore>((set, get) => ({
    balances: {},
    requested: new Set(),
    setNetwrkBalanceIsLoading: (network) => {
        set((state) => {
            const updatedRequested = new Set(state.requested)
            updatedRequested.delete(network)
            return {
                balances: { ...state.balances },
                requested: updatedRequested,
            }
        })
    },
    setNetworkBalance: (network, balance) => {
        set((state) => {
            const updatedRequested = new Set(state.requested)
            updatedRequested.add(network)
            return {
                balances: {
                    ...state.balances,
                    [network]: balance,
                },
                requested: updatedRequested,
            }
        })
    },

    getNetworkBalance: (network) => {
        const res = get().balances[network]
        return res
    },

    areAllBalancesFetched: (networks) => {
        const requested = get().requested
        const res = networks.every((n) => requested.has(n))
        return res
    },
}))
