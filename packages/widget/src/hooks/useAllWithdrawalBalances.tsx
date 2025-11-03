import { useSettingsState } from "@/context/settings"
import { selectResolvedSortingBalances, useBalanceStore } from "../stores/balanceStore"
import { useEffect, useMemo, useRef } from "react"
import { NetworkWithTokens } from "@/Models/Network"
import { NetworkBalance } from "@/Models/Balance"
import { useBalanceAccounts } from "@/context/balanceAccounts"

export default function useAllWithdrawalBalances() {

    const networks = useSettingsState().networks
    const balanceAccounts = useBalanceAccounts("from")
    const walletNetworks = useMemo(() => {
        return balanceAccounts.map(account => {
            const withdrawalNetworks = account.walletWithdrawalSupportedNetworks
            if (!withdrawalNetworks || withdrawalNetworks.length === 0) return []
            return withdrawalNetworks.map(networkName => {
                const network = networks.find(n => n.name === networkName)
                if (!network) return null
                return {
                    address: account.address,
                    network,
                }
            })
        }).flat().filter(item => item !== null) as Array<{ address: string, network: NetworkWithTokens }>
    }, [balanceAccounts, networks])

    const walletNetwokrsString = useMemo(() => {
        return walletNetworks.map(item => `${item.address}-${item.network.name}`).join(',')
    }, [walletNetworks])

    useEffect(() => {
        if (walletNetworks)
            useBalanceStore.getState().initSortingBalances(walletNetworks)
    }, [walletNetwokrsString])

    const lastBalancesRef = useRef<Record<string, NetworkBalance> | null>(null)
    const resolvedBalances = useBalanceStore(selectResolvedSortingBalances)
    const isLoading = useBalanceStore(s => s.sortingDataIsLoading)

    if (resolvedBalances != null && Object.keys(resolvedBalances).length > 0) {
        lastBalancesRef.current = resolvedBalances
    }

    const result = resolvedBalances === null && isLoading ? lastBalancesRef.current : resolvedBalances

    return useMemo(() => ({ isLoading, balances: result }), [result, isLoading])
}