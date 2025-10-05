import useSWR from "swr"
import { Network, Token } from "../../Models/Network"
import { GasResolver } from "./gasResolver"
import { GasWithToken } from "./providers/types"
import { Wallet } from "@/Models/WalletProvider"

//TODO: Add type for address
const useSWRGas = (address: any, network: Network | undefined, token?: Token, wallet?: Wallet, amount?: string): { gasData: GasWithToken | undefined, isGasLoading: boolean, gasError: any } => {

    const { data: gasData, error: gasError, isLoading } = useSWR((network && address) ? `/gases/${address}/${network.name}/${token?.symbol}` : null, () => {
        if (!network || !token || !address) return
        return new GasResolver().getGas({ address, network, token, wallet, amount })
    }, { refreshInterval: 60000 })

    return {
        gasData: gasData,
        isGasLoading: isLoading,
        gasError: gasError
    }
}

export default useSWRGas