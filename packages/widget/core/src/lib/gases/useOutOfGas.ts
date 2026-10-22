import { TokenBalance } from "@layerswap/widget-types";
import { Network, Token } from "@layerswap/widget-types";
import useSWRGas from "./useSWRGas"
import { resolveGasBalanceBudget } from "./resolveGasBalanceBudget"
import type { GasProps } from "@layerswap/widget-types"

interface UseOutOfGasParams {
    address: string | undefined
    network: Network | undefined | null
    token: Token | undefined | null
    amount: number | string | undefined
    balances: TokenBalance[] | null | undefined
    minAllowedAmount?: number
    maxAllowedAmount?: number
    transaction?: Pick<GasProps, 'recipientAddress' | 'callData' | 'amountInBaseUnits'>
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
}: UseOutOfGasParams): { outOfGas: boolean } => {
    const { gasData } = useSWRGas(address, network, token, amount, undefined, { transaction })
    const nativeTokenBalance = balances?.find(b => b.token === network?.token?.symbol)

    const balance = nativeTokenBalance?.amount
    const isNativeToken = nativeTokenBalance?.isNativeCurrency && token?.symbol === network?.token?.symbol

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
