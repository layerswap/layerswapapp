import { useEffect, useMemo } from "react"
import useWallet from "../../../hooks/useWallet"
import SecondaryButton from "../../buttons/secondaryButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useFee } from "../../../context/feeContext";
import { useQueryState } from "../../../context/query";
import useSWRBalance from "../../../lib/newbalances/useSWRBalance";
import useSWRGas from "../../../lib/newgases/useSWRGas";

const MinMax = ({ onAddressGet }: { onAddressGet: (address: string) => void }) => {

    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi } = useFee()

    const query = useQueryState()

    const { provider } = useWallet(from, 'autofil')

    const wallet = provider?.activeWallet
    const { gas } = useSWRGas(wallet?.address, values.from, fromCurrency)
    const { balance } = useSWRBalance(wallet?.address, values.from)

    const handleSetMinAmount = () => {
        setFieldValue('amount', minAllowedAmount);
    }

    const gasAmount = gas?.find(g => g?.token === fromCurrency?.symbol)?.gas || 0
    const walletBalance = wallet && balance?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    const native_currency = from?.token

    let maxAllowedAmount: number | null = maxAmountFromApi || 0
    if (query.balances && fromCurrency) {
        try {
            const balancesFromQueries = new URL(window.location.href.replaceAll('&quot;', '"')).searchParams.get('balances');
            const parsedBalances = balancesFromQueries && JSON.parse(balancesFromQueries)
            let balancesTyped = parsedBalances
            if (balancesTyped && balancesTyped[fromCurrency.symbol] && balancesTyped[fromCurrency.symbol] > Number(minAllowedAmount)) {
                maxAllowedAmount = Math.min(maxAllowedAmount, balancesTyped[fromCurrency.symbol]);
            }
        }
        // in case the query parameter had bad formatting just ignoe
        catch { }
    } else if (walletBalance && (walletBalance.amount >= Number(minAllowedAmount) && walletBalance.amount <= Number(maxAmountFromApi))) {
        if (((native_currency?.symbol === fromCurrency?.symbol) || !native_currency) && ((walletBalance.amount - gasAmount) >= Number(minAllowedAmount) && (walletBalance.amount - gasAmount) <= Number(maxAmountFromApi))) {
            maxAllowedAmount = walletBalance.amount - gasAmount
        }
        else maxAllowedAmount = walletBalance.amount
    }
    else {
        maxAllowedAmount = Number(maxAmountFromApi) || 0
    }

    const handleSetMaxAmount = async () => {
        setFieldValue('amount', maxAllowedAmount);
    }

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