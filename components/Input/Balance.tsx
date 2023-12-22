import { useBalancesState } from "../../context/balances"



const BalanceComponent = () => {
    const { balances, isBalanceLoading, gases, isGasLoading } = useBalancesState()

    return <div
        className="border-primary-text text-xs text-primary-text flex items-center space-x-1">
        <span>Balance:</span>
        {/* {isBalanceLoading ?
            <span className="ml-1 h-3 w-6 rounded-sm bg-gray-500 animate-pulse" />
            :
            <span>{walletBalance}</span>} */}
    </div>

}