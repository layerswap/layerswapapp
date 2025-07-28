import { SwapFormValues } from "../../Pages/SwapPages/Form/SwapFormValues";
import { useEffect, useRef } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import { useSwapDataState } from "../../../context/swap";
import useSWRBalance from "../../../lib/balances/useSWRBalance";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromCurrency, toCurrency, from, destination_address } = values
    const { selectedSourceAccount } = useSwapDataState()
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balance, isBalanceLoading } = useSWRBalance(address, network)
    const tokenBalance = balance?.find(b => b?.network === from?.name && b?.token === token?.symbol)
    const truncatedBalance = tokenBalance?.amount !== undefined ? truncateDecimals(tokenBalance.amount, token?.precision) : ''

    const previouslySelectedSource = useRef(from);

    useEffect(() => {
        previouslySelectedSource.current = from
    }, [from, selectedSourceAccount?.address])

    const previouslySelectedDestination = useRef(to);

    useEffect(() => {
        previouslySelectedDestination.current = to
    }, [to, destination_address])

    if (isBalanceLoading)
        return <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse pl-2 ml-2' />

    return (
        <>
            {
                network && token && truncatedBalance &&
                <span className="pl-2">{truncatedBalance}</span>
            }
        </>
    )
}

export default Balance