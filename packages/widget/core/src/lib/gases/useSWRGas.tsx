'use client'
import { type Wallet } from '@layerswap/widget-types';
import { Network, Token } from "@layerswap/widget-types";
import { resolverService } from "../resolvers/resolverService"
import { GasWithToken } from "@layerswap/widget-types";
import useSWR from "swr"
import { getKey, useBalanceStore } from "../../stores/balanceStore"

const useSWRGas = (address: string | undefined | null, network: Network | undefined | null, token?: Token | null, amount?: number | string | null,  wallet?: Wallet ): { gasData: GasWithToken | undefined, isGasLoading: boolean, gasError: any } => {

    const hasAmount = amount != null && amount !== ''
    const balanceAmount = useBalanceStore(state => {
        if (hasAmount || !address || !network || !token) return undefined
        return state.balances[getKey(address, network.name)]?.data?.balances?.find(
            balance => balance.network === network.name && balance.token === token.symbol
        )?.amount
    })
    const estimationAmount = hasAmount ? Number(amount) : balanceAmount
    const canEstimate = estimationAmount !== undefined && Number.isFinite(estimationAmount) && estimationAmount > 0

    const { data: gasData, error: gasError, isLoading } = useSWR((network && token && address && canEstimate) ? `/gases/${address}/${network.name}/${token.symbol}/${estimationAmount}` : null, () => {
        if (!network || !token || !address || !canEstimate) return
        return resolverService.getGasResolver().getGas({ address, network, token, amount: estimationAmount, wallet })
    }, { refreshInterval: 60000 })

    return {
        gasData,
        isGasLoading: isLoading,
        gasError: gasError
    }
}

export default useSWRGas
