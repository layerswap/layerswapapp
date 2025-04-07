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

    setNetworkBalance: (network: string, balance: NetworkBalance) => void
    getNetworkBalance: (network: string) => NetworkBalance | undefined
    areAllBalancesFetched: (networks: string[]) => boolean
}

export const useNetworksBalanceStore = create<BalanceStore>((set, get) => ({
    balances: {},
    requested: new Set(),

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
        return get().balances[network]
    },

    areAllBalancesFetched: (networks) => {
        const requested = get().requested
        const res = networks.every((n) => requested.has(n))
        // console.log(requested, "fetched", balances)
        console.log(networks.filter((n) => !requested.has(n)), "not fetched")
        return res
    },
}))
