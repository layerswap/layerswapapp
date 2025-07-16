import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { useEffect, useRef } from "react";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { useSwapDataState } from "@/context/swap";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import { motion } from "framer-motion";
import { useSelectAccounts } from "@/context/selectedAccounts";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromAsset: fromCurrency, toAsset: toCurrency, from, destination_address } = values
    const { selectedSourceAccount } = useSelectAccounts()
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balances, isBalanceLoading } = useSWRBalance(address, network)
    const tokenBalance = balances?.find(b => b?.network === from?.name && b?.token === token?.symbol)
    const truncatedBalance = tokenBalance?.amount !== undefined ? truncateDecimals(tokenBalance?.amount, token?.precision) : ''

    const previouslySelectedSource = useRef(from);

    useEffect(() => {
        previouslySelectedSource.current = from
    }, [from, selectedSourceAccount?.address])

    const previouslySelectedDestination = useRef(to);

    useEffect(() => {
        previouslySelectedDestination.current = to
    }, [to, destination_address])

    if (isBalanceLoading)
        return <motion.div
            layoutId="affect"
            className="w-4/5 relative rounded-b-lg text-center bg-secondary-400 py-0.5 text-xs text-primary-text-placeholder">
            <div className='h-[10px] w-12 inline-flex bg-gray-500 rounded-xs animate-pulse' />
        </motion.div>


    return (
        <>
            {
                (network && token && truncatedBalance) ?
                    <motion.div
                        layoutId="affect"
                        className="w-4/5 relative rounded-b-lg text-center bg-secondary-400 py-0.5 text-xs text-primary-text-placeholder">
                        <span>{truncatedBalance}</span>
                    </motion.div>
                    : null
            }
        </>
    )
}

export default Balance