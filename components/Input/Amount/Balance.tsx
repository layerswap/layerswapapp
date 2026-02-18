import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import InfoIcon from "@/components/icons/InfoIcon";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useBalance } from "@/lib/balances/useBalance";
import { FC } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { NetworkRoute } from "@/Models/Network";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromAsset: fromCurrency, toAsset: toCurrency, from, destination_address } = values
    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balances, isLoading } = useBalance(address, network, { refreshInterval: 20000, dedupeInterval: 20000 })
    const tokenBalance = balances?.find(
        b => b?.network === network?.name && b?.token === token?.symbol
    )
    const truncatedBalance = tokenBalance?.amount !== undefined ? truncateDecimals(tokenBalance?.amount, token?.precision) : ''

    if (!isLoading && !(network && token && tokenBalance))
        return null;

    return <div className="min-w-4/5 -top-px p-1 mx-2 relative rounded-b-lg text-center bg-secondary-400 py-0.5 text-xs text-secondary-text leading-[18px] font-normal">
        {
            isLoading ?
                <div className='h-[10px] w-fit px-4 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                : !truncatedBalance ?
                    <span>-</span>
                    : (network && token && truncatedBalance) ?
                        ((Number(tokenBalance?.amount) >= 0 && Number(tokenBalance?.amount) < Number(values.amount) && values.depositMethod === 'wallet' && direction == 'from') ?
                            <InsufficientBalance balance={truncatedBalance} />
                            :
                            <span>{truncatedBalance}</span>
                        )
                        : null
        }
    </div>
}

const InsufficientBalance: FC<{ balance: string }> = ({ balance }) => {
    return <Tooltip openOnClick>
        <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-warning-foreground justify-center">
                <InfoIcon className='w-3 h-3' />
                <p>{balance}</p>
            </div>
        </TooltipTrigger>
        <TooltipContent className="!bg-secondary-400 !border-0 !p-3 !rounded-xl">
            <div className="flex items-center gap-2 justify-center">
                <InfoIcon className='w-4 h-4 text-warning-foreground' />
                <p className="text-sm">Insufficient balance</p>
            </div>
        </TooltipContent>
    </Tooltip>
}

export default Balance