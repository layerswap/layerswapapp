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
    const { balances, mutate } = useSWRBalance(selectedSourceAccount?.address, from)

    const gasAmount = gas || 0;

    const handleSetMinAmount = () => {
        setFieldValue('amount', limitsMinAmount);
    }
    const walletBalance = selectedSourceAccount?.address ? balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    const native_currency = from?.token

    let maxAllowedAmount: number = useMemo(() => {
        return resolveMacAllowedAmount({ fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency })
    }, [fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency])

    const handleSetMaxAmount = async () => {
        const updatedBalances = await mutate()
        const updatedWalletBalance = updatedBalances?.balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
        const maxAllowedAmount = resolveMacAllowedAmount({ fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance: updatedWalletBalance, gasAmount, native_currency })
        setFieldValue('amount', maxAllowedAmount);
    }

    return (
        <div className="flex gap-1">
            <SecondaryButton disabled={!limitsMinAmount} onClick={handleSetMinAmount} size="xs" className="!py-0 !font-medium !text-sm !bg-secondary-300 rounded-sm !border-0">
                Min
            </SecondaryButton>
            <SecondaryButton disabled={!maxAllowedAmount} onClick={handleSetMaxAmount} size="xs" className="!py-0 !font-medium !text-sm !bg-secondary-300 rounded-sm !border-0">
                Max
            </SecondaryButton>
        </div>
    )
}

export default MinMax