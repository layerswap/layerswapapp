import { useMemo } from "react"
import useWallet from "../hooks/useWallet"
import WarningMessage from "./WarningMessage"
import { useFormikContext } from "formik"
import { SwapFormValues } from "./DTOs/SwapFormValues"
import { truncateDecimals } from "./utils/RoundDecimals"
import { useFee } from "../context/feeContext"
import { Balance, Gas } from "../Models/Balance"
import useSWRBalance from "../lib/newbalances/useSWRBalance"
import useSWRGas from "../lib/newgases/useSWRGas"

const ReserveGasNote = ({ onSubmit }: { onSubmit: (walletBalance: Balance, networkGas: Gas) => void }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const { minAllowedAmount } = useFee()

    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values.from && getProvider(values.from)
    }, [values.from, getProvider])

    const wallet = provider?.getConnectedWallet()
    const { balance } = useSWRBalance(wallet?.address, values.from)
    const { gas } = useSWRGas(wallet?.address, values.from, values.fromCurrency)

    const walletBalance = wallet && balance?.find(b => b?.network === values?.from?.name && b?.token === values?.fromCurrency?.symbol)
    const networkGas = values.from?.name ?
        gas?.find(g => g?.token === values?.fromCurrency?.symbol)
        : null

    const mightBeAutOfGas = !!(networkGas && walletBalance?.isNativeCurrency && (Number(values.amount)
        + networkGas?.gas) > walletBalance.amount
        && minAllowedAmount
        && walletBalance.amount > minAllowedAmount
    )
    const gasToReserveFormatted = mightBeAutOfGas ? truncateDecimals(networkGas?.gas, values?.fromCurrency?.precision) : 0

    return (
        mightBeAutOfGas && gasToReserveFormatted > 0 &&
        <WarningMessage messageType="warning" className="mt-4">
            <div className="font-normal text-primary-text">
                <div>
                    You might not be able to complete the transaction.
                </div>
                <div onClick={() => onSubmit(walletBalance, networkGas)} className="cursor-pointer border-b border-dotted border-primary-text w-fit hover:text-primary hover:border-primary text-primary-text">
                    <span>Reserve</span> <span>{gasToReserveFormatted.toFixed(values.fromCurrency?.precision)}</span> <span>{values?.fromCurrency?.symbol}</span> <span>for gas.</span>
                </div>
            </div>
        </WarningMessage>
    )
}

export default ReserveGasNote