import { TokenBalance } from "@/Models/Balance"
import { Network, Token } from "@/Models/Network"
import useSWRGas from "./useSWRGas"

interface UseOutOfGasParams {
    address: string | undefined
    network: Network | undefined | null
    token: Token | undefined | null
    amount: number | string | undefined
    balances: TokenBalance[] | null | undefined
    minAllowedAmount?: number
    maxAllowedAmount?: number
}

const useOutOfGas = ({
    address,
    network,
    token,
    amount,
    balances,
    minAllowedAmount,
    maxAllowedAmount
}: UseOutOfGasParams): { outOfGas: boolean } => {
    const { gasData } = useSWRGas(address, network, token, amount)
    const nativeTokenBalance = balances?.find(b => b.token === network?.token?.symbol)

    const balance = nativeTokenBalance?.amount
    const isNativeToken = nativeTokenBalance?.isNativeCurrency && token?.symbol === network?.token?.symbol

    if (balance == null || !gasData || !amount || !isNativeToken || minAllowedAmount == null || maxAllowedAmount == null) {
        return { outOfGas: false }
    }

    const numAmount = Number(amount)
    const totalNeeded = numAmount + gasData.gas
    const balanceCoversAmount = numAmount <= balance
    const balanceExceedsMaxWithGas = balance > (maxAllowedAmount + gasData.gas)
    const balanceAboveMin = balance > minAllowedAmount

    const outOfGas = totalNeeded > balance
        && balanceCoversAmount
        && balanceAboveMin
        && !balanceExceedsMaxWithGas

    return { outOfGas }
}

export default useOutOfGas
