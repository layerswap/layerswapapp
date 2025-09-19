import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import useWallet from "@/hooks/useWallet";
import InfoIcon from "@/components/icons/InfoIcon";
import { useSelectedAccount } from "@/context/balanceAccounts";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromAsset: fromCurrency, toAsset: toCurrency, from, destination_address } = values
    const { provider } = useWallet(from, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", provider?.name);
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balances, isBalanceLoading } = useSWRBalance(address, network, { refreshInterval: 20000 })
    const tokenBalance = balances?.find(
        b => b?.network === network?.name && b?.token === token?.symbol
    )
    const truncatedBalance = tokenBalance?.amount !== undefined ? truncateDecimals(tokenBalance?.amount, token?.precision) : ''

    if (!isBalanceLoading && !(network && token && tokenBalance))
        return null;

    return <div className="w-4/5 -top-[1px] relative rounded-b-lg text-center bg-secondary-400 py-0.5 text-xs text-secondary-text leading-[18px] font-normal">
        {
            isBalanceLoading ?
                <div className='h-[10px] w-fit px-4 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                : !truncatedBalance ?
                    <div className="flex items-center justify-center gap-1 text-orange-400">
                        <InfoIcon className='w-3 h-3' />
                        <span>Network issue</span>
                    </div>
                : (network && token && truncatedBalance) ?
                    <span>{truncatedBalance}</span>
                    : <span></span>
        }
    </div>
}

export default Balance