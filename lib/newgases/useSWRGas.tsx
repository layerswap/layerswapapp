import useSWR from "swr"
import { Network, Token } from "../../Models/Network"
import { GasResolver } from "./gasResolver"

const useSWRGas = (address: string | undefined, network: Network | undefined, token?: Token) => {

    const { data: gasData, error: gasError } = useSWR((network && address) ? `/gases/${address}/${token?.symbol}` : null, () => {
        if (!network || !token) return
        return new GasResolver().getGas({network, token})
    }, {refreshInterval: 60000})

    return {
        gas: gasData,
        isGasLoading: !gasError && !gasData,
        gasError: gasError
    }
}

export default useSWRGas