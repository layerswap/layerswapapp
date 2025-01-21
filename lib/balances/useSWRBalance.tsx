import useSWR from "swr"
import { NetworkWithTokens, RouteNetwork } from "../../Models/Network"
import { BalanceResolver } from "./balanceResolver"

const useSWRBalance = (address: string | undefined, network: NetworkWithTokens | undefined) => {

    const { data, error, mutate, isLoading } = useSWR((network && address) ? `/balances/${address}/${network.name}` : null, () => {
        if (!address || !network) return
        return new BalanceResolver().getBalance(address, network)
    }, { refreshInterval: 400000, keepPreviousData: true, dedupingInterval: 200000 })

    return {
        balance: data,
        isBalanceLoading: isLoading,
        isError: error,
        mutate
    }
}

export default useSWRBalance