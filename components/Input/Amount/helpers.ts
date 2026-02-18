import { TokenBalance } from "@/Models/Balance"
import { Token } from "@/Models/Network"


type ResoleMaxAllowedAmountProps = {
    limitsMaxAmount: number | undefined
    walletBalance: TokenBalance | undefined
    gasAmount: number
    fromCurrency: Token
    native_currency: Token | undefined
    depositMethod: 'wallet' | 'deposit_address' | undefined
    fallbackAmount: number
}

export const resolveMaxAllowedAmount = (props: ResoleMaxAllowedAmountProps) => {
    const { limitsMaxAmount, walletBalance, gasAmount, fromCurrency, native_currency, depositMethod, fallbackAmount } = props

    if (!walletBalance || isNaN(Number(walletBalance.amount)) || depositMethod !== 'wallet')
        return limitsMaxAmount

    const shouldPayGasWithTheToken = Number(walletBalance.amount) > 0 && (native_currency?.symbol === fromCurrency?.symbol) || !native_currency
    const payableAmount = Number(walletBalance.amount) - gasAmount

    if (!shouldPayGasWithTheToken)
        return isNaN(Number(walletBalance.amount)) ? 0 : Number(walletBalance.amount)

    const res = Number(Number(payableAmount).toFixed(fromCurrency?.decimals))
    return res <= 0 ? fallbackAmount : res
}