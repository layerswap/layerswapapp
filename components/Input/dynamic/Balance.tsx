import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useBalancesState } from "../../../context/balances";
import useWallet from "../../../hooks/useWallet";
import { useEffect, useRef } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import useBalance from "../../../hooks/useBalance";
import { isValidAddress } from "../../../lib/address/validator";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromCurrency, toCurrency, from, destination_address, source_address } = values
    const { balances, isBalanceLoading } = useBalancesState()
    const { provider: destinationWalletProvider } = useWallet(to, 'autofil')

    const { fetchNetworkBalances, fetchGas } = useBalance()

    const destinationNetworkWallet = destinationWalletProvider?.activeWallet

    const walletBalance = source_address ? balances[source_address || '']?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    const destinationBalance = balances[destination_address || (destinationNetworkWallet?.address || '')]?.find(b => b?.network === to?.name && b?.token === toCurrency?.symbol)

    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, fromCurrency?.precision)
    const destinationBalanceAmount = destinationBalance?.amount && truncateDecimals(destinationBalance?.amount, toCurrency?.precision)
    const balanceAmount = direction === 'from' ? walletBalanceAmount : destinationBalanceAmount

    const previouslySelectedSource = useRef(from);

    useEffect(() => {
        if (((previouslySelectedSource.current && (from?.type == previouslySelectedSource.current?.type))
            || (from && isValidAddress(source_address, from)))
            && from
            && direction === 'from') {
            fetchNetworkBalances(from, source_address);
        }
        previouslySelectedSource.current = from
    }, [from, source_address])

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
            && source_address
            && from
            && fromCurrency
            && fetchGas(from, fromCurrency, destination_address || source_address)

    }, [from, fromCurrency, source_address])
    console.log('balanceAmount', balanceAmount)
    return (
        <>
            {
                (direction === 'from' ? (from && fromCurrency && source_address) : (to && toCurrency)) &&
                    isBalanceLoading ?
                    <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                    :
                    (balanceAmount !== undefined && !isNaN(balanceAmount)) &&
                    <>
                        {balanceAmount}
                    </>
            }
        </>
    )
}

export default Balance