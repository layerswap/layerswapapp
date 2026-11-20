import { NetworkType, TokenBalance } from "@layerswap/widget-types";
import { Network, Token } from "@layerswap/widget-types";
import useSWRGas from "./useSWRGas"
import { resolveGasBalanceBudget } from "./resolveGasBalanceBudget"
import type { GasWithToken, GasProps } from "@layerswap/widget-types"

interface UseOutOfGasParams {
    address: string | undefined
    network: Network | undefined | null
    token: Token | undefined | null
    amount: number | string | undefined
    balances: TokenBalance[] | null | undefined
    minAllowedAmount?: number
    maxAllowedAmount?: number
    transaction?: Pick<GasProps, 'recipientAddress' | 'callData' | 'amountInBaseUnits'>
    /** A supplied estimate owns the fee, including while its data is pending. */
    gasEstimate?: { gasData?: GasWithToken }
}

type NativeGasShortage = {
    requiredFee: number
    availableBalance: number
    symbol: string
}

const useOutOfGas = ({
    address,
    network,
    token,
    amount,
    balances,
    minAllowedAmount,
    maxAllowedAmount,
    transaction,
    gasEstimate,
}: UseOutOfGasParams): { outOfGas: boolean, nativeGasShortage?: NativeGasShortage } => {
    const { gasData: fetchedGas } = useSWRGas(address, network, token, amount, undefined, { transaction, enabled: gasEstimate === undefined })
    const gasData = gasEstimate ? gasEstimate.gasData : fetchedGas
    const nativeTokenBalance = balances?.find(balance =>
        balance.network === network?.name
        && balance.token === network?.token?.symbol
        && balance.isNativeCurrency
    )

    const balance = nativeTokenBalance?.amount
    const isNativeToken = nativeTokenBalance?.isNativeCurrency && token?.symbol === network?.token?.symbol

    // A token amount never pays for EVM gas. Compare only the source account's
    // native balance with the fee cap; route limits and token amounts are unrelated.
    const requiredFee = gasData?.maxFee ?? gasData?.gas
    if (network?.type === NetworkType.EVM
        && token?.contract
        && network.token
        && gasData?.token.symbol === network.token.symbol
        && balance != null
        && Number.isFinite(balance)
        && requiredFee != null
        && Number.isFinite(requiredFee)
        && requiredFee > balance) {
        return {
            outOfGas: false,
            nativeGasShortage: { requiredFee, availableBalance: balance, symbol: network.token.symbol },
        }
    }

    if (balance == null || !gasData || !amount || !isNativeToken || minAllowedAmount == null || maxAllowedAmount == null) {
        return { outOfGas: false }
    }

    const numAmount = Number(amount)
    const gasAndReserve = resolveGasBalanceBudget(gasData)
    const totalNeeded = numAmount + gasAndReserve
    const balanceCoversAmount = numAmount <= balance
    const balanceExceedsMaxWithGas = balance > (maxAllowedAmount + gasAndReserve)
    const balanceAboveMin = balance > minAllowedAmount

    const outOfGas = totalNeeded > balance
        && balanceCoversAmount
        && balanceAboveMin
        && !balanceExceedsMaxWithGas

    return { outOfGas }
}

export default useOutOfGas
