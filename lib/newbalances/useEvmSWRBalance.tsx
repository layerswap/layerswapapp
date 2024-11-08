import useSWR from "swr"
import { NetworkWithTokens } from "../../Models/Network"
import { BalanceResolver } from "./balanceResolver"

const useEvmSWRBalance = (address: string | undefined, network: NetworkWithTokens | undefined) => {

    const { data, error } = useSWR((network && address) ? `/balances/${address}/${network.name}` : null, () => {
        if (!address || !network) return
        return new BalanceResolver().getBalance(address, network)
    })

    return {
        balance: data,
        isLoading: !error && !data,
        isError: error
    }
}




export default useEvmSWRBalance