import SecondaryButton from "../../buttons/secondaryButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import useSWRGas from "@/lib/gases/useSWRGas";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useMemo } from "react";
import { resolveMaxAllowedAmount } from "./helpers";
import { updateForm } from "@/components/Swap/Form/updateForm";
import useSelectedWalletStore from "@/context/selectedAccounts/pickerSelectedWallets";

type MinMaxProps = {
    fromCurrency: NetworkRouteToken,
    from: NetworkRoute,
    limitsMaxAmount: number,
    limitsMinAmount: number
}

const MinMax = (props: MinMaxProps) => {

    const { setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, limitsMinAmount, limitsMaxAmount } = props;
    const { pickerSelectedWallet: selectedSourceAccount } = useSelectedWalletStore('from')

    const { gas } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency)
    const { balances, mutate } = useSWRBalance(selectedSourceAccount?.address, from)

    const gasAmount = gas || 0;

    const handleSetMinAmount = () => {
        updateForm({
            formDataKey: 'amount',
            formDataValue: limitsMinAmount.toString(),
            setFieldValue
        })
    }
    const walletBalance = selectedSourceAccount?.address ? balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    const native_currency = from?.token

    let maxAllowedAmount: number = useMemo(() => {
        return resolveMaxAllowedAmount({ fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency })
    }, [fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency])

    const handleSetMaxAmount = async () => {
        const updatedBalances = await mutate()
        const updatedWalletBalance = updatedBalances?.balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
        const maxAllowedAmount = resolveMaxAllowedAmount({ fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance: updatedWalletBalance, gasAmount, native_currency })
        updateForm({
            formDataKey: 'amount',
            formDataValue: maxAllowedAmount.toString(),
            setFieldValue
        })
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