'use client'
import { type Wallet } from '@layerswap/widget-types';
import { Network, Token } from "@layerswap/widget-types";
import { resolverService } from "../resolvers/resolverService"
import { GasWithToken } from "@layerswap/widget-types";
import useSWR from "swr"

const useSWRGas = (
    address: string | undefined | null,
    network: Network | undefined | null,
    token?: Token | null,
    amount?: number | string | null,
    wallet?: Wallet,
    { enabled = true }: { enabled?: boolean } = {},
): { gasData: GasWithToken | undefined, isGasLoading: boolean, gasError: any } => {

    // Preserve the last values while hidden controls finish their collapse animation.
    const { data: gasData, error: gasError, isLoading } = useSWR((enabled && network && address) ? `/gases/${address}/${network.name}/${token?.symbol}${amount ? `/${amount}` : ''}` : null, () => {
        if (!network || !token || !address) return
        return resolverService.getGasResolver().getGas({ address, network, token, amount: Number(amount), wallet  })
    }, { refreshInterval: enabled ? 60000 : 0, keepPreviousData: !enabled })

    return {
        gasData,
        isGasLoading: isLoading,
        gasError: gasError
    }
}

export default useSWRGas
