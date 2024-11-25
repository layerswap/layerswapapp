import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useWallet from "../../../hooks/useWallet";
import { useEffect, useMemo, useRef } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import useSWRBalance from "../../../lib/newbalances/useSWRBalance";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromCurrency, toCurrency, from, destination_address } = values
    const { getAutofillProvider: getProvider } = useWallet()

    const sourceWalletProvider = useMemo(() => {
        return from && getProvider(from)
    }, [from, getProvider])

    const destinationWalletProvider = useMemo(() => {
        return to && getProvider(to)
    }, [to, getProvider])

    const sourceNetworkWallet = sourceWalletProvider?.getConnectedWallet(values.from)
    const destinationNetworkWallet = destinationWalletProvider?.getConnectedWallet(values.to)

    const { balance: sourceBalance, isBalanceLoading: isSourceBalanceLoading } = useSWRBalance(sourceNetworkWallet?.address, from)
    const { balance: destBalance, isBalanceLoading: isDestBalanceLoading } = useSWRBalance(destination_address || (destinationNetworkWallet?.address || ''), to)

    const walletBalance = sourceNetworkWallet && sourceBalance?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    const destinationBalance = destBalance?.find(b => b?.network === to?.name && b?.token === toCurrency?.symbol)

    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, fromCurrency?.precision)
    const destinationBalanceAmount = destinationBalance?.amount && truncateDecimals(destinationBalance?.amount, toCurrency?.precision)
    const balanceAmount = direction === 'from' ? walletBalanceAmount : destinationBalanceAmount
    const isBalanceLoading = direction === 'from' ? isSourceBalanceLoading : isDestBalanceLoading

    const token = direction === 'from' ? fromCurrency : toCurrency

    const previouslySelectedSource = useRef(from);

    useEffect(() => {
        previouslySelectedSource.current = from
    }, [from, sourceNetworkWallet?.address])

    const previouslySelectedDestination = useRef(to);

    useEffect(() => {
        previouslySelectedDestination.current = to
    }, [to, destination_address, destinationNetworkWallet?.address])

    return (
        <>
            {
                (direction === 'from' ? (from && fromCurrency && sourceNetworkWallet) : (to && toCurrency)) &&
                    isBalanceLoading ?
                    <div className="text-xs text-right absolute right-0 -top-7">
                        <div className='bg-secondary-700 py-1.5 pl-2 text-xs'>
                            <div>
                                <span>Balance:&nbsp;</span>
                                <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                            </div>
                        </div>
                    </div>
                    :
                    (balanceAmount !== undefined && !isNaN(balanceAmount)) &&
                    <div className="text-xs text-right absolute right-0 -top-7">
                        <div className='bg-secondary-700 py-1.5 pl-2 text-xs'>
                            <div>
                                <span>Balance:&nbsp;</span>
                                <span>{balanceAmount > 0 ? balanceAmount.toFixed(token?.precision) : balanceAmount}</span>
                            </div>
                        </div>
                    </div>
            }
        </>
    )
}

export default Balance