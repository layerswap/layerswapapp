import { TokenBalance } from "@layerswap/widget-types";
import { Token } from "@layerswap/widget-types";


type ResoleMaxAllowedAmountProps = {
    limitsMaxAmount: number | undefined
    walletBalance: TokenBalance | undefined
    gasBalanceBudget: number
    fromCurrency: Token
    native_currency: Token | undefined
    depositMethod: 'wallet' | 'deposit_address' | undefined
}

export const resolveMaxAllowedAmount = (props: ResoleMaxAllowedAmountProps) => {
    const { limitsMaxAmount, walletBalance, gasBalanceBudget, fromCurrency, native_currency, depositMethod } = props

    if (!walletBalance || isNaN(Number(walletBalance.amount)) || depositMethod !== 'wallet')
        return limitsMaxAmount

    const shouldPayGasWithTheToken = Number(walletBalance.amount) > 0 && (native_currency?.symbol === fromCurrency?.symbol) || !native_currency
    const payableAmount = Number(walletBalance.amount) - gasBalanceBudget

    if (!shouldPayGasWithTheToken)
        return isNaN(Number(walletBalance.amount)) ? 0 : Number(walletBalance.amount)

    const res = Number(Number(payableAmount).toFixed(fromCurrency?.decimals))
    return Math.max(0, res)
}
