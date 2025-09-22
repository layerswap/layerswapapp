import WarningMessage from "./WarningMessage"
import { useFormikContext } from "formik"
import { SwapFormValues } from "./DTOs/SwapFormValues"
import { truncateDecimals } from "./utils/RoundDecimals"
import { TokenBalance } from "../Models/Balance"
import useSWRBalance from "../lib/balances/useSWRBalance"
import useSWRGas from "../lib/gases/useSWRGas"
import { useQuoteData } from "@/hooks/useFee"
import { useMemo } from "react"
import useWallet from "@/hooks/useWallet"
import { useSelectedAccount } from "@/context/balanceAccounts"

type Props = {
    onSubmit: (nativeTokenBalance: TokenBalance, networkGas: number) => void
    minAllowedAmount: ReturnType<typeof useQuoteData>['minAllowedAmount']
    maxAllowedAmount: ReturnType<typeof useQuoteData>['maxAllowedAmount']
}

const ReserveGasNote = ({ onSubmit, minAllowedAmount, maxAllowedAmount }: Props) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", provider?.name);
    const { balances } = useSWRBalance(selectedSourceAccount?.address, values.from)
    const { gasData } = useSWRGas(selectedSourceAccount?.address, values.from, values.fromAsset)

    const nativeTokenBalance = balances?.find(b => b.token == values?.from?.token?.symbol)

    const mightBeOutOfGas = nativeTokenBalance?.amount && !!(gasData && nativeTokenBalance?.isNativeCurrency && (Number(values.amount)
        + gasData.gas) > nativeTokenBalance.amount
        && minAllowedAmount
        && nativeTokenBalance.amount > minAllowedAmount
        && !(maxAllowedAmount && (nativeTokenBalance.amount > (maxAllowedAmount + gasData.gas)))
    )
    const gasToReserveFormatted = mightBeOutOfGas ? truncateDecimals(gasData.gas, values?.fromAsset?.precision) : ''

    return (
        <>
            {
                mightBeOutOfGas && gasToReserveFormatted ?
                    (
                        (Number(nativeTokenBalance.amount) < Number(gasData)) ?
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
                                    <div onClick={() => onSubmit(nativeTokenBalance, gasData.gas)} className="cursor-pointer border-b border-dotted border-primary-text w-fit hover:text-primary hover:border-primary text-primary-text">
                                        <span>Reserve</span> <span>{gasToReserveFormatted}</span> <span>{values?.fromAsset?.symbol}</span> <span>for gas.</span>
                                    </div>
                                </div>
                            </WarningMessage>
                    ) : null
            }
        </>

    )
}

export default ReserveGasNote