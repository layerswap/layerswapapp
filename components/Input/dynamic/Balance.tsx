import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useWallet from "../../../hooks/useWallet";
import { useEffect, useRef } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import { useSwapDataState } from "../../../context/swap";
import useSWRBalance from "../../../lib/newbalances/useSWRBalance";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromCurrency, toCurrency, from, destination_address } = values
    const { provider: destinationWalletProvider } = useWallet(to, 'autofil')
    const { selectedSourceAccount } = useSwapDataState()

    const destinationNetworkWallet = destinationWalletProvider?.activeWallet


    const { balance: sourceBalance, isBalanceLoading: isSourceBalanceLoading } = useSWRBalance(selectedSourceAccount?.address, from)
    const { balance: destBalance, isBalanceLoading: isDestBalanceLoading } = useSWRBalance(destination_address || (destinationNetworkWallet?.address || ''), to)

    const walletBalance = selectedSourceAccount && sourceBalance?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    const destinationBalance = destBalance?.find(b => b?.network === to?.name && b?.token === toCurrency?.symbol)

    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, fromCurrency?.precision)
    const destinationBalanceAmount = destinationBalance?.amount && truncateDecimals(destinationBalance?.amount, toCurrency?.precision)
    const balanceAmount = direction === 'from' ? walletBalanceAmount : destinationBalanceAmount
    const isBalanceLoading = direction === 'from' ? isSourceBalanceLoading : isDestBalanceLoading

    const token = direction === 'from' ? fromCurrency : toCurrency

    const previouslySelectedSource = useRef(from);

    useEffect(() => {
        previouslySelectedSource.current = from
    }, [from, selectedSourceAccount?.address])

    const previouslySelectedDestination = useRef(to);

    useEffect(() => {
        previouslySelectedDestination.current = to
    }, [to, destination_address, destinationNetworkWallet?.address])

    return (
        <>
            {
                (direction === 'from' ? (from && fromCurrency && selectedSourceAccount) : (to && toCurrency)) &&
                    isBalanceLoading ?
                    <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                    :
                    (balanceAmount !== undefined && !isNaN(balanceAmount)) &&
                    <span>{balanceAmount > 0 ? balanceAmount.toFixed(token?.precision) : balanceAmount}</span>
            }
        </>
    )
}

export default Balance