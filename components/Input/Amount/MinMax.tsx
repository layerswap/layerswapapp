import SecondaryButton from "../../buttons/secondaryButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useSWRBalance from "../../../lib/balances/useSWRBalance";
import useSWRGas from "../../../lib/gases/useSWRGas";
import { useSwapDataState } from "../../../context/swap";
import { NetworkRoute, NetworkRouteToken, Token } from "../../../Models/Network";
import { useMemo } from "react";
import { resolveMacAllowedAmount } from "./helpers";

type MinMaxProps = {
    fromCurrency: NetworkRouteToken,
    from: NetworkRoute,
    limitsMaxAmount: number,
    limitsMinAmount: number
}

const MinMax = (props: MinMaxProps) => {

    const { setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, limitsMinAmount, limitsMaxAmount } = props;

    const { selectedSourceAccount } = useSwapDataState()

    const { gas } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency)
    const { balance, mutate } = useSWRBalance(selectedSourceAccount?.address, from)

    const gasAmount = gas || 0;

    const handleSetMinAmount = () => {
        setFieldValue('amount', limitsMinAmount);
    }
    const walletBalance = selectedSourceAccount?.address ? balance?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    const native_currency = from?.token

    let maxAllowedAmount: number = useMemo(() => {
        return resolveMacAllowedAmount({ fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency })
    }, [fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency])

    const handleSetMaxAmount = async () => {
        const updatedBalance = await mutate()
        const updatedWalletBalance = updatedBalance?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
        const maxAllowedAmount = resolveMacAllowedAmount({ fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance: updatedWalletBalance, gasAmount, native_currency })
        setFieldValue('amount', maxAllowedAmount);
    }

    return (
        <div className="flex flex-col justify-center">
            <div className="text-xs flex flex-col items-center space-x-1 md:space-x-2 ml-2 md:ml-5 px-2">
                <div className="flex">
                    <SecondaryButton disabled={!limitsMinAmount} onClick={handleSetMinAmount} size="xs">
                        MIN
                    </SecondaryButton>
                    <SecondaryButton disabled={!maxAllowedAmount} onClick={handleSetMaxAmount} size="xs" className="ml-1.5">
                        MAX
                    </SecondaryButton>
                </div>
            </div>
        </div>
    )
}

export default MinMax