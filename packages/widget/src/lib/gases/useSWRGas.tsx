import useSWR from "swr"
import { Network, Token } from "../../Models/Network"
import { resolverService } from "../resolvers/resolverService"
import { GasWithToken } from "../wallets/types/gas"
import { Wallet } from "@/lib/wallets/types/wallet"

//TODO: Add type for address
const useSWRGas = (address: any, network: Network | undefined, token?: Token, wallet?: Wallet, amount?: string): { gasData: GasWithToken | undefined, isGasLoading: boolean, gasError: any } => {

    const { data: gasData, error: gasError, isLoading } = useSWR((network && address) ? `/gases/${address}/${network.name}/${token?.symbol}` : null, () => {
        if (!network || !token || !address) return
        return resolverService.getGasResolver().getGas({ address, network, token, wallet, amount  })
    }, { refreshInterval: 60000 })

    return {
        gasData: gasData,
        isGasLoading: isLoading,
        gasError: gasError
    }
}

export default useSWRGas