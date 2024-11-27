import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useBalancesState } from "../../../context/balances";
import useWallet from "../../../hooks/useWallet";
import { useEffect, useRef } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import useBalance from "../../../hooks/useBalance";
import { isValidAddress } from "../../../lib/address/validator";
import { useSwapDataState } from "../../../context/swap";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromCurrency, toCurrency, from, destination_address } = values
    const { balances, isBalanceLoading } = useBalancesState()
    const { provider: destinationWalletProvider } = useWallet(to, 'autofil')
    const { selectedSourceAccount } = useSwapDataState()
    const { fetchNetworkBalances, fetchGas } = useBalance()

    const destinationNetworkWallet = destinationWalletProvider?.activeWallet

    const walletBalance = selectedSourceAccount ? balances[selectedSourceAccount.address || '']?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    const destinationBalance = balances[destination_address || (destinationNetworkWallet?.address || '')]?.find(b => b?.network === to?.name && b?.token === toCurrency?.symbol)

    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, fromCurrency?.precision)
    const destinationBalanceAmount = destinationBalance?.amount && truncateDecimals(destinationBalance?.amount, toCurrency?.precision)
    const balanceAmount = direction === 'from' ? walletBalanceAmount : destinationBalanceAmount

    const token = direction === 'from' ? fromCurrency : toCurrency

    const previouslySelectedSource = useRef(from);

    useEffect(() => {
        if (((previouslySelectedSource.current && (from?.type == previouslySelectedSource.current?.type))
            || (from && isValidAddress(selectedSourceAccount?.address, from)))
            && from
            && direction === 'from') {
            fetchNetworkBalances(from, selectedSourceAccount?.address);
        }
        previouslySelectedSource.current = from
    }, [from, selectedSourceAccount?.address])

    const previouslySelectedDestination = useRef(to);

    useEffect(() => {
        const destinationAddress = destination_address || destinationNetworkWallet?.address
        if (((previouslySelectedDestination.current && (to?.type == previouslySelectedDestination.current?.type))
            || (to && isValidAddress(destinationAddress, to)))
            && to
            && direction === 'to') fetchNetworkBalances(to, destinationAddress);
        previouslySelectedDestination.current = to
    }, [to, destination_address, destinationNetworkWallet?.address])

    useEffect(() => {
        direction === 'from'
            && selectedSourceAccount
            && from
            && fromCurrency
            && fetchGas(from, fromCurrency, destination_address || selectedSourceAccount.address)

    }, [from, fromCurrency, selectedSourceAccount?.address])
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