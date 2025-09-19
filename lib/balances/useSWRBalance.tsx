import useSWR from "swr"
import { NetworkWithTokens } from "@/Models/Network"
import { BalanceResolver } from "./balanceResolver"
type Opts = {
    refreshInterval?: number
}
const useSWRBalance = (address: string | undefined, network: NetworkWithTokens | undefined, options?: Opts) => {
    const { data, error, mutate, isLoading } = useSWR(network ? `/balances/${address}/${network.name}` : null, () => {
        if (!network) return
        return new BalanceResolver().getBalance(network, address)
    }, { refreshInterval: options?.refreshInterval || 80000, keepPreviousData: true, dedupingInterval: options?.refreshInterval || 80000, errorRetryInterval: 1000, errorRetryCount: 3 })

    return {
        balances: data?.balances,
        totalInUSD: data?.totalInUSD,
        isBalanceLoading: isLoading,
        isError: error,
        mutate
    }
}

export default useSWRBalance