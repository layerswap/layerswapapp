import { truncateDecimals } from "@/components/utils/RoundDecimals"
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

interface UseOutOfGasResult {
    outOfGas: boolean
    gasToReserveFormatted: string
    mightBeOutOfGas: boolean
}

const useOutOfGas = ({
    address,
    network,
    token,
    amount,
    balances,
    minAllowedAmount,
    maxAllowedAmount
}: UseOutOfGasParams): UseOutOfGasResult => {
    const { gasData } = useSWRGas(address, network, token, amount)
    const nativeTokenBalance = balances?.find(b => b.token === network?.token?.symbol)

    const mightBeOutOfGas = !!(nativeTokenBalance?.amount && !!(gasData && nativeTokenBalance?.isNativeCurrency && (Number(amount)
        + gasData.gas) > nativeTokenBalance.amount
        && minAllowedAmount && maxAllowedAmount && amount
        && token?.symbol === network?.token?.symbol
        && nativeTokenBalance.amount > minAllowedAmount
        && !(Number(amount) > nativeTokenBalance.amount)
        && !(maxAllowedAmount && (nativeTokenBalance.amount > (maxAllowedAmount + gasData.gas))))
    )
    const gasToReserveFormatted = mightBeOutOfGas ? truncateDecimals(gasData.gas, token?.precision) : ''
    const outOfGas = !!(mightBeOutOfGas && gasToReserveFormatted)

    return {
        outOfGas,
        gasToReserveFormatted,
        mightBeOutOfGas
    }
}

export default useOutOfGas
