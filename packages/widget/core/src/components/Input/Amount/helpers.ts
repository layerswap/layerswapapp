import { TokenBalance } from "@layerswap/widget-types";
import { Token } from "@layerswap/widget-types";


type ResoleMaxAllowedAmountProps = {
    limitsMaxAmount: number | undefined
    walletBalance: TokenBalance | undefined
    gasAmount: number | undefined
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
    if (!shouldPayGasWithTheToken)
        return isNaN(Number(walletBalance.amount)) ? 0 : Number(walletBalance.amount)

    // An unavailable estimate is not a zero fee. In particular, changing the
    // amount starts a new estimate; another Max click must not spend its reserve.
    if (gasAmount == null || !Number.isFinite(gasAmount) || gasAmount < 0)
        return undefined

    const payableAmount = Number(walletBalance.amount) - (gasAmount * 1.02)
    const res = Number(Number(payableAmount).toFixed(fromCurrency?.decimals))
    return res <= 0 ? fallbackAmount : res
}
