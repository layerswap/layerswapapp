import useSWR from "swr"
import { Network, Token } from "@/Models/Network"
import { GasResolver } from "./gasResolver"

const useSWRGas = (address: string | undefined | null, network: Network | undefined | null, token?: Token | null, amount?: number | string | null ): { gas: number | undefined, isGasLoading: boolean, gasError: any } => {

    const { data: gasData, error: gasError, isLoading } = useSWR((network && address) ? `/gases/${address}/${network.name}/${token?.symbol}${amount ? `/${amount}` : ''}` : null, () => {
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