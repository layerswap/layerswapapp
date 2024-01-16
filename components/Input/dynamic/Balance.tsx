import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useBalancesState } from "../../../context/balances";
import useWallet from "../../../hooks/useWallet";
import { useEffect, useMemo } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";

const Balance = ({ values, direction, onLoad }: { values: SwapFormValues, direction: string, onLoad: (address: string) => void }) => {

    const { to, fromCurrency, toCurrency, from } = values
    const { balances, isBalanceLoading } = useBalancesState()
    const { getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return from && getProvider(from)
    }, [from, getProvider])

    const wallet = provider?.getConnectedWallet()
    const walletBalance = wallet && balances[wallet.address]?.find(b => b?.network === from?.internal_name && b?.token === fromCurrency?.asset)
    const destinationBalance = wallet && balances[wallet.address]?.find(b => b?.network === to?.internal_name && b?.token === toCurrency?.asset)

    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, fromCurrency?.precision)
    const destinationBalanceAmount = destinationBalance?.amount && truncateDecimals(destinationBalance?.amount, toCurrency?.precision)
    const balanceAmount = direction === 'from' ? walletBalanceAmount : destinationBalanceAmount

    useEffect(() => {
        wallet?.address && onLoad(wallet?.address)
    }, [wallet])

    return (
        (direction === 'from' ? (from && fromCurrency) : (to && toCurrency)) && balanceAmount != undefined && !isNaN(balanceAmount) &&
        <div className="text-xs text-right absolute right-0 -top-7">
            <div className='bg-secondary-700 py-1.5 pl-2 text-xs'>
                <div>
                    <span>Balance:&nbsp;</span>
                    {isBalanceLoading ?
                        <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                        :
                        <span>{balanceAmount}</span>}
                </div>
            </div>
        </div>
    )
}

export default Balance