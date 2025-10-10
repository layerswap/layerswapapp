import { TokenBalance } from "@/Models/Balance"
import { Token } from "@/Models/Network"


type ResoleMaxAllowedAmountProps = {
    limitsMaxAmount: number | undefined
    walletBalance: TokenBalance | undefined
    gasAmount: number
    fromCurrency: Token
    native_currency: Token | undefined
    depositMethod: 'wallet' | 'deposit_address' | undefined
}

export const resolveMaxAllowedAmount = (props: ResoleMaxAllowedAmountProps) => {
    const { limitsMaxAmount, walletBalance, gasAmount, fromCurrency, native_currency, depositMethod } = props

    if (!walletBalance || !walletBalance.amount || (limitsMaxAmount && walletBalance.amount > limitsMaxAmount) || depositMethod !== 'wallet')
        return limitsMaxAmount

    const shouldPayGasWithTheToken = (native_currency?.symbol === fromCurrency?.symbol) || !native_currency
    const payableAmount = walletBalance.amount - gasAmount

    if (!shouldPayGasWithTheToken)
        return walletBalance.amount

    return Number(payableAmount.toFixed(fromCurrency?.decimals))
}