import { TokenBalance } from "../../../Models/Balance"
import { Token } from "../../../Models/Network"


type ResoleMaxAllowedAmountProps = {
    limitsMaxAmount: number | undefined
    walletBalance: TokenBalance | undefined
    gasAmount: number
    fromCurrency: Token
    native_currency: Token | undefined
}

export const resolveMaxAllowedAmount = (props: ResoleMaxAllowedAmountProps) => {
    const { limitsMaxAmount, walletBalance, gasAmount, fromCurrency, native_currency } = props

    if (!walletBalance || !walletBalance.amount)
        return limitsMaxAmount

    //calculate balance with reduced gas amount, if it is not in range we do not force the limits api min amount
    const shouldPayGasWithTheToken = (native_currency?.symbol === fromCurrency?.symbol) || !native_currency
    const payableAmount = walletBalance.amount - gasAmount
    const payableIsInRange = isInRange({ value: payableAmount, min: 0, max: limitsMaxAmount || Infinity })

    if (!shouldPayGasWithTheToken || !payableIsInRange)
        return walletBalance.amount

    return Number(payableAmount.toFixed(fromCurrency?.decimals))
}

const isInRange = ({ value, min, max }: { value: Number, min: Number, max: Number }) => {
    return value >= min && value <= max
}