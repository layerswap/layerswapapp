'use client'
import { type Wallet } from '@layerswap/widget-types';
import { Network, Token } from "@layerswap/widget-types";
import { resolverService } from "../resolvers/resolverService"
import { GasWithToken } from "@layerswap/widget-types";
import useSWR from "swr"
import { getKey, useBalanceStore } from "../../stores/balanceStore"
import type { GasProps } from '@layerswap/widget-types'

type GasOptions = {
    enabled?: boolean
    transaction?: Pick<GasProps, 'recipientAddress' | 'callData' | 'amountInBaseUnits'>
}

const useSWRGas = (
    address: string | undefined | null,
    network: Network | undefined | null,
    token?: Token | null,
    amount?: number | string | null,
    wallet?: Wallet,
    { enabled = true, transaction }: GasOptions = {},
): { gasData: GasWithToken | undefined, isGasLoading: boolean, gasError: any } => {

    const hasAmount = amount != null && amount !== ''
    const balanceAmount = useBalanceStore(state => {
        if (hasAmount || !address || !network || !token) return undefined
        return state.balances[getKey(address, network.name)]?.data?.balances?.find(
            balance => balance.network === network.name && balance.token === token.symbol
        )?.amount
    })
    const estimationAmount = hasAmount ? Number(amount) : balanceAmount
    const hasTransaction = transaction?.recipientAddress != null && transaction.callData != null
    const canEstimate = estimationAmount !== undefined && Number.isFinite(estimationAmount)
        && (hasTransaction ? estimationAmount >= 0 : estimationAmount > 0)
    const baseKey = `/gases/${address}/${network?.name}/${token?.symbol}/${estimationAmount}`
    const gasKey = hasTransaction
        ? [baseKey, transaction.recipientAddress, transaction.callData, transaction.amountInBaseUnits ?? null]
        : baseKey

    // Preserve the last values while hidden controls finish their collapse animation.
    const { data: gasData, error: gasError, isLoading } = useSWR((enabled && network && token && address && canEstimate) ? gasKey : null, () => {
        if (!network || !token || !address || !canEstimate) return
        return resolverService.getGasResolver().getGas({ address, network, token, amount: estimationAmount, wallet, ...transaction })
    }, { refreshInterval: enabled ? 60000 : 0, keepPreviousData: !enabled })

    return {
        gasData,
        isGasLoading: isLoading,
        gasError: gasError
    }
}

export default useSWRGas
