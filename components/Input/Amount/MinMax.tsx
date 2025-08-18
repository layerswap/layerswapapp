import SecondaryButton from "../../buttons/secondaryButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import useSWRGas from "@/lib/gases/useSWRGas";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useMemo } from "react";
import { resolveMaxAllowedAmount } from "./helpers";
import { updateForm } from "@/components/Swap/Form/updateForm";
import useWallet from "@/hooks/useWallet";

type MinMaxProps = {
    fromCurrency: NetworkRouteToken,
    from: NetworkRoute,
    limitsMaxAmount: number | undefined,
    limitsMinAmount: number | undefined,
    onActionHover: (value: number | undefined) => void
}

const MinMax = (props: MinMaxProps) => {

    const { setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, limitsMinAmount, limitsMaxAmount, onActionHover } = props;

    const { provider } = useWallet(from, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);

    const { gas } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency)
    const { balances, mutate: mutateBalances } = useSWRBalance(selectedSourceAccount?.address, from)

    const walletBalance = useMemo(() => {
        return selectedSourceAccount?.address ? balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    }, [selectedSourceAccount?.address, balances, from?.name, fromCurrency?.symbol])

    const gasAmount = gas || 0;

    const native_currency = from?.token

    let maxAllowedAmount: number | undefined = useMemo(() => {
        return resolveMaxAllowedAmount({ fromCurrency, limitsMaxAmount, walletBalance, gasAmount, native_currency })
    }, [fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency])

    const handleSetValue = (value: string) => {
        mutateBalances()
        updateForm({
            formDataKey: 'amount',
            formDataValue: value,
            setFieldValue
        })
        onActionHover(undefined)
    }

    const handleSetMinAmount = () => {
        if (!limitsMinAmount)
            throw new Error("Wallet balance is not available");
        handleSetValue(limitsMinAmount.toString())
    }
    const handleSetHalfAmount = async () => {
        if (!walletBalance)
            throw new Error("Wallet balance is not available");
        handleSetValue((walletBalance?.amount / 2).toString())
    }

    const handleSetMaxAmount = async () => {
        if (!maxAllowedAmount)
            throw new Error("Wallet balance is not available");
        handleSetValue(maxAllowedAmount.toString())
    }

    return (
        <div className="flex gap-1.5 text-xs group" onMouseLeave={() => onActionHover(undefined)}>
            {
                Number(limitsMinAmount) > 0 &&
                <button
                    onMouseEnter={() => onActionHover(limitsMinAmount)}
                    disabled={!limitsMinAmount}
                    onClick={handleSetMinAmount}
                    typeof="button"
                    type="button"
                    className={"px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 border border-secondary-300 hover:border-secondary-100 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer"}
                >
                    Min
                </button>
            }
            {
                Number(walletBalance?.amount) > 0 &&
                <button
                    onMouseEnter={() => onActionHover((walletBalance?.amount || 0) / 2)}
                    onClick={handleSetHalfAmount}
                    typeof="button"
                    type="button"
                    className={"px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 border border-secondary-300 hover:border-secondary-100 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer"}
                >
                    50%
                </button>
            }
            {
                Number(maxAllowedAmount) > 0 &&
                <button
                    onMouseEnter={() => onActionHover(maxAllowedAmount)}
                    disabled={!maxAllowedAmount}
                    onClick={handleSetMaxAmount}
                    typeof="button"
                    type="button"
                    className={"px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 border border-secondary-300 hover:border-secondary-100 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer"}
                >
                    Max
                </button>
            }
        </div >
    )
}

export default MinMax