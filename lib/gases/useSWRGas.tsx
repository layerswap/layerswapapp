import useSWR from "swr"
import { Network, Token } from "@/Models/Network"
import { GasResolver } from "./gasResolver"

const useSWRGas = (address: string | undefined, network: Network | undefined, token?: Token, amount?: number | string): { gas: number | undefined, isGasLoading: boolean, gasError: any } => {

    const { data: gasData, error: gasError, isLoading } = useSWR((network && address) ? `/gases/${address}/${network.name}/${token?.symbol}` : null, () => {
        if (!network || !token || !address) return
        return new GasResolver().getGas({ address, network, token, amount: Number(amount) })
    }, { refreshInterval: 60000 })

    return {
        gas: gasData,
        isGasLoading: isLoading,
        gasError: gasError
    }
}

export default useSWRGas