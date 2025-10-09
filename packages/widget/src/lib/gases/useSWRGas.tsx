import { Network, Token } from "@/Models/Network"
import { resolverService } from "../resolvers/resolverService"
import { GasWithToken } from "../wallets/types/gas"
import { Wallet } from "@/lib/wallets/types/wallet"
import useSWR from "swr"

const useSWRGas = (address: string | undefined | null, network: Network | undefined | null, token?: Token | null, amount?: number | string | null,  wallet?: Wallet ): { gasData: GasWithToken | undefined, isGasLoading: boolean, gasError: any } => {

    const { data: gasData, error: gasError, isLoading } = useSWR((network && address) ? `/gases/${address}/${network.name}/${token?.symbol}${amount ? `/${amount}` : ''}` : null, () => {
        if (!network || !token || !address) return
        return resolverService.getGasResolver().getGas({ address, network, token, amount: Number(amount), wallet  })
    }, { refreshInterval: 60000 })

    return {
        gasData,
        isGasLoading: isLoading,
        gasError: gasError
    }
}

export default useSWRGas