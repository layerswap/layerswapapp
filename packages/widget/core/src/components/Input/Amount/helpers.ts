import { TokenBalance } from "@layerswap/widget-types";
import { Token } from "@layerswap/widget-types";
import { truncateToDecimals } from "@/components/utils/RoundDecimals";


type ResolveMaxAllowedAmountProps = {
    limitsMaxAmount: number | undefined
    walletBalance: TokenBalance | undefined
    gasAmount: number | undefined
    gasReserve?: number
    fromCurrency: Token
    native_currency: Token | undefined
    depositMethod: 'wallet' | 'deposit_address' | undefined
}

export const resolveMaxAllowedAmount = (props: ResolveMaxAllowedAmountProps) => {
    const { limitsMaxAmount, walletBalance, gasAmount, gasReserve = 0, fromCurrency, native_currency, depositMethod } = props

    if (!walletBalance || depositMethod !== 'wallet')
        return limitsMaxAmount

    if (walletBalance.error || walletBalance.amount == null || !Number.isFinite(walletBalance.amount) || walletBalance.amount < 0) return undefined
    const cap = (value: number) => Math.max(0, Math.min(value, limitsMaxAmount ?? Infinity))
    if (walletBalance.amount === 0) return 0
    const shouldPayGasWithTheToken = native_currency?.symbol === fromCurrency?.symbol || !native_currency
    if (!shouldPayGasWithTheToken)
        return cap(Number(walletBalance.amount))

    // An unavailable estimate is not a zero fee. In particular, changing the
    // amount starts a new estimate; another Max click must not spend its reserve.
    if (gasAmount == null || !Number.isFinite(gasAmount) || gasAmount < 0 || !Number.isFinite(gasReserve) || gasReserve < 0)
        return undefined

    const res = resolveNativePayableAmount(Number(walletBalance.amount), gasAmount, gasReserve, fromCurrency.decimals)
    return cap(res)
}

/** Native balance left to send after the buffered gas fee and the reserve the network requires to stay in the account. */
export const resolveNativePayableAmount = (balance: number, gasAmount: number, gasReserve: number, decimals: number) => {
    const payableAmount = balance - (gasAmount * 1.02) - gasReserve
    return Number(truncateToDecimals(String(payableAmount), decimals))
}
