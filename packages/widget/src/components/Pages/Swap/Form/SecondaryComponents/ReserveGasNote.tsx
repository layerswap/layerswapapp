import WarningMessage from "@/components/Common/WarningMessage"
import { useFormikContext } from "formik"
import { truncateDecimals } from "@/components/utils/RoundDecimals"
import { TokenBalance } from "@/Models/Balance"
import { useBalance } from "@/lib/balances/useBalance";
import useSWRGas from "@/lib/gases/useSWRGas"
import { useQuoteData } from "@/hooks/useFee"
import { useSelectedAccount } from "@/context/swapAccounts"
import { SwapFormValues } from "../SwapFormValues"

type Props = {
    onSubmit: (nativeTokenBalance: TokenBalance, networkGas: number) => void
    minAllowedAmount: ReturnType<typeof useQuoteData>['minAllowedAmount']
    maxAllowedAmount: ReturnType<typeof useQuoteData>['maxAllowedAmount']
}

const ReserveGasNote = ({ onSubmit, minAllowedAmount, maxAllowedAmount }: Props) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const selectedSourceAccount = useSelectedAccount("from", values.from?.name);
    const { balances } = useBalance(selectedSourceAccount?.address, values.from)
    const { gasData } = useSWRGas(selectedSourceAccount?.address, values.from, values.fromAsset, values.amount)

    const nativeTokenBalance = balances?.find(b => b.token == values?.from?.token?.symbol)

    const mightBeOutOfGas = !!(nativeTokenBalance?.amount && !!(gasData && nativeTokenBalance?.isNativeCurrency && (Number(values.amount)
        + gasData.gas) > nativeTokenBalance.amount
        && minAllowedAmount
        && !(maxAllowedAmount && (nativeTokenBalance.amount > (maxAllowedAmount + gasData.gas))))
    )
    const gasToReserveFormatted = mightBeOutOfGas ? truncateDecimals(gasData.gas, values?.fromAsset?.precision) : ''

    return (
        <>
            {
                mightBeOutOfGas && gasToReserveFormatted ?
                    (
                        <div className="mt-3">
                            {
                                (Number(nativeTokenBalance.amount) < Number(gasData.gas)) ?
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
                                                <span>Reserve</span> <span>{gasToReserveFormatted}</span> <span>{nativeTokenBalance?.token}</span> <span>for gas.</span>
                                            </div>
                                        </div>
                                    </WarningMessage>
                            }
                        </div>
                    ) : null
            }
        </>

    )
}

export default ReserveGasNote