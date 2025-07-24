import { truncateDecimals } from "@/components/utils/RoundDecimals"
import { TokenBalance } from "../../../Models/Balance"
import { Token } from "../../../Models/Network"


type ResoleMaxAllowedAmountProps = {
    limitsMinAmount: number
    limitsMaxAmount: number
    walletBalance: TokenBalance | undefined
    gasAmount: number
    fromCurrency: Token
    native_currency: Token | undefined
}

export const resolveMaxAllowedAmount = (props: ResoleMaxAllowedAmountProps) => {
    const { limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, fromCurrency, native_currency } = props

    if (!walletBalance || !isInRange({ value: walletBalance.amount, min: limitsMinAmount, max: limitsMaxAmount }))
        return limitsMaxAmount

    //calculate balance with reduced gas amount, if it is not in range we do not force the limits api min amount
    const shouldPayGasWithTheToken = (native_currency?.symbol === fromCurrency?.symbol) || !native_currency
    const payableAmount = walletBalance.amount - gasAmount
    const payableIsInRange = isInRange({ value: payableAmount, min: limitsMinAmount, max: limitsMaxAmount })
    const truncatedBalance = truncateDecimals(walletBalance.amount, fromCurrency?.precision)

    if (!shouldPayGasWithTheToken || !payableIsInRange)
        return truncatedBalance

    return Number(payableAmount.toFixed(fromCurrency?.decimals))
}

const isInRange = ({ value, min, max }: { value: Number, min: Number, max: Number }) => {
    return value >= min && value <= max
}