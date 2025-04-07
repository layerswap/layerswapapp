import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useEffect, useRef } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import { useSwapDataState } from "../../../context/swap";
import useSWRBalance from "../../../lib/balances/useSWRBalance";

const Balance = ({ values, direction, isAmountFocused }: { values: SwapFormValues, direction: string, isAmountFocused?: boolean }) => {

    const { to, fromCurrency, toCurrency, from, destination_address } = values
    const { selectedSourceAccount } = useSwapDataState()
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balance, isBalanceLoading, isError } = useSWRBalance(address, network)
    const tokenBalance = balance?.find(b => b?.network === from?.name && b?.token === token?.symbol)
    const truncatedBalance = tokenBalance?.amount && truncateDecimals(tokenBalance?.amount, token?.precision)

    const previouslySelectedSource = useRef(from);

    useEffect(() => {
        previouslySelectedSource.current = from
    }, [from, selectedSourceAccount?.address])

    const previouslySelectedDestination = useRef(to);

    useEffect(() => {
        previouslySelectedDestination.current = to
    }, [to, destination_address])

    if (isBalanceLoading)
        return <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-xs animate-pulse' />

    return (
        <>
            {
                (network && token && network) &&

                (truncatedBalance !== undefined && !isNaN(truncatedBalance)) &&
                <div className={`${isAmountFocused ? "absolute rounded-lg mt-1 px-1.5 w-full" : "w-4/5 -mt-0.5 rounded-b-lg text-center"} bg-secondary-400 m-auto py-0.5 text-xs text-primary-text-placeholder `}>
                    <span>{truncatedBalance > 0 ? truncatedBalance.toFixed(token?.precision) : truncatedBalance}</span>
                </div>
            }
        </>
    )
}

export default Balance