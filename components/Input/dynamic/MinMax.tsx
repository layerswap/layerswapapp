import { useCallback, useEffect, useMemo } from "react"
import useWallet from "../../../hooks/useWallet"
import SecondaryButton from "../../buttons/secondaryButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useBalance from "../../../hooks/useBalance";
import { useFee } from "../../../context/feeContext";
import { useBalancesState } from "../../../context/balances";

const MinMax = ({ onAddressGet }: { onAddressGet: (address: string) => void }) => {

    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, to, destination_address } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi } = useFee()
    const { balances, gases } = useBalancesState()

    const { getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return from && getProvider(from)
    }, [from, getProvider])

    const { fetchBalance, fetchGas } = useBalance()

    const wallet = provider?.getConnectedWallet()

    const handleSetMinAmount = () => {
        setFieldValue('amount', minAllowedAmount);
    }

    const gasAmount = gases[from?.internal_name || '']?.find(g => g?.token === fromCurrency?.asset)?.gas || 0
    const walletBalance = wallet && balances[wallet.address]?.find(b => b?.network === from?.internal_name && b?.token === fromCurrency?.asset)

    const maxAllowedAmount = (walletBalance &&
        maxAmountFromApi &&
        minAllowedAmount &&
        ((walletBalance.amount - gasAmount) >= minAllowedAmount &&
            (walletBalance.amount - gasAmount) <= maxAmountFromApi)) ?
        walletBalance.amount - Number(gasAmount)
        : maxAmountFromApi

    const handleSetMaxAmount = useCallback(async () => {
        from && await fetchBalance(from);
        from && fromCurrency && fetchGas(from, fromCurrency, destination_address || "");
        setFieldValue('amount', maxAllowedAmount);
    }, [from, to, fromCurrency, destination_address, maxAllowedAmount])

    useEffect(() => {
        wallet?.address && onAddressGet(wallet.address)
    }, [wallet])

    return (
        <div className="flex flex-col justify-center">
            <div className="text-xs flex flex-col items-center space-x-1 md:space-x-2 ml-2 md:ml-5 px-2">
                <div className="flex">
                    <SecondaryButton disabled={!minAllowedAmount} onClick={handleSetMinAmount} size="xs">
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