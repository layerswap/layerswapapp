import WarningMessage from "../../../Common/WarningMessage"
import { useFormikContext } from "formik"
import { SwapFormValues } from "../../../DTOs/SwapFormValues"
import { truncateDecimals } from "../../../utils/RoundDecimals"
import { useFee } from "../../../../context/feeContext"
import { Balance } from "../../../../Models/Balance"
import useSWRBalance from "../../../../lib/balances/useSWRBalance"
import useSWRGas from "../../../../lib/gases/useSWRGas"
import { useSwapDataState } from "../../../../context/swap"

const ReserveGasNote = ({ onSubmit }: { onSubmit: (walletBalance: Balance, networkGas: number) => void }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const { minAllowedAmount, maxAllowedAmount } = useFee()
    const { selectedSourceAccount } = useSwapDataState()

    const { balance } = useSWRBalance(selectedSourceAccount?.address, values.from)
    const { gas: networkGas } = useSWRGas(selectedSourceAccount?.address, values.from, values.fromCurrency)

    const walletBalance = selectedSourceAccount && balance?.find(b => b?.network === values?.from?.name && b?.token === values?.fromCurrency?.symbol)

    const mightBeOutOfGas = !!(networkGas && walletBalance?.isNativeCurrency && (Number(values.amount)
        + networkGas) > walletBalance.amount
        && minAllowedAmount
        && walletBalance.amount > minAllowedAmount
        && !(maxAllowedAmount && (walletBalance.amount > (maxAllowedAmount + networkGas)))
    )
    const gasToReserveFormatted = mightBeOutOfGas ? truncateDecimals(networkGas, values?.fromCurrency?.precision) : 0

    return (
        <>
            {
                mightBeOutOfGas && gasToReserveFormatted > 0 &&
                (
                    (Number(walletBalance.amount) < Number(networkGas)) ?
                        <WarningMessage messageType="warning" className="mt-4">
                            <div className="font-normal text-primary-text">
                                You don&apos;t have enough funds to cover gas fees.
                            </div>
                        </WarningMessage>
                        :
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
        </>

    )
}

export default ReserveGasNote