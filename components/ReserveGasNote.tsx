import WarningMessage from "./WarningMessage"
import { useFormikContext } from "formik"
import { SwapFormValues } from "./DTOs/SwapFormValues"
import { truncateDecimals } from "./utils/RoundDecimals"
import { TokenBalance } from "../Models/Balance"
import useSWRBalance from "../lib/balances/useSWRBalance"
import useSWRGas from "../lib/gases/useSWRGas"
import { transformFormValuesToQuoteArgs, useQuoteData } from "@/hooks/useFee"
import { useMemo } from "react"
import useWallet from "@/hooks/useWallet"

const ReserveGasNote = ({ onSubmit }: { onSubmit: (walletBalance: TokenBalance, networkGas: number) => void }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values), [values]);
    const { minAllowedAmount, maxAllowedAmount } = useQuoteData(quoteArgs)
    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);
    const { balances } = useSWRBalance(selectedSourceAccount?.address, values.from)
    const { gas: networkGas } = useSWRGas(selectedSourceAccount?.address, values.from, values.fromAsset)

    const walletBalance = selectedSourceAccount && balances?.find(b => b?.network === values?.from?.name && b?.token === values?.fromAsset?.symbol)

    const mightBeOutOfGas = !!(networkGas && walletBalance?.isNativeCurrency && (Number(values.amount)
        + networkGas) > walletBalance.amount
        && minAllowedAmount
        && walletBalance.amount > minAllowedAmount
        && !(maxAllowedAmount && (walletBalance.amount > (maxAllowedAmount + networkGas)))
    )
    const gasToReserveFormatted = mightBeOutOfGas ? truncateDecimals(networkGas, values?.fromAsset?.precision) : ''

    return (
        <>
            {
                mightBeOutOfGas && gasToReserveFormatted &&
                (
                    (Number(walletBalance.amount) < Number(networkGas)) ?
                        <WarningMessage messageType="warning">
                            <div className="font-normal text-primary-text">
                                You don&apos;t have enough funds to cover gas fees.
                            </div>
                        </WarningMessage>
                        :
                        <WarningMessage messageType="warning">
                            <div className="font-normal text-primary-text">
                                <div>
                                    You might not be able to complete the transaction.
                                </div>
                                <div onClick={() => onSubmit(walletBalance, networkGas)} className="cursor-pointer border-b border-dotted border-primary-text w-fit hover:text-primary hover:border-primary text-primary-text">
                                    <span>Reserve</span> <span>{gasToReserveFormatted}</span> <span>{values?.fromAsset?.symbol}</span> <span>for gas.</span>
                                </div>
                            </div>
                        </WarningMessage>
                )
            }
        </>

    )
}

export default ReserveGasNote