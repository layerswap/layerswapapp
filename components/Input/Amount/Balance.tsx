import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import InfoIcon from "@/components/icons/InfoIcon";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useBalance } from "@/lib/balances/useBalance";
import { FC } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { NetworkRoute } from "@/Models/Network";
import { RefreshCw } from "lucide-react";
import useOutOfGas from "@/lib/gases/useOutOfGas";
import ReserveGasNote from "@/components/ReserveGasNote";

const Balance = ({ values, direction, minAllowedAmount, maxAllowedAmount }: { values: SwapFormValues, direction: string, minAllowedAmount?: number, maxAllowedAmount?: number }) => {

    const { to, fromAsset: fromCurrency, toAsset: toCurrency, from, destination_address } = values
    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balances, isLoading, mutate } = useBalance(address, network, { refreshInterval: 20000, dedupeInterval: 20000 })

    const tokenBalance = balances?.find(
        b => b?.network === network?.name && b?.token === token?.symbol
    )
    const truncatedBalance = tokenBalance?.amount !== undefined ? truncateDecimals(tokenBalance?.amount, token?.precision) : ''

    const { outOfGas } = useOutOfGas({
        address: selectedSourceAccount?.address,
        network: values.from,
        token: values.fromAsset,
        amount: values.amount,
        balances,
        minAllowedAmount,
        maxAllowedAmount
    })

    const insufficientBalance = Number(tokenBalance?.amount) >= 0 && Number(tokenBalance?.amount) < Number(values.amount) && values.depositMethod === 'wallet' && direction == 'from'

    if (!isLoading && !(network && token && tokenBalance))
        return null;

    return <div className="min-w-4/5 -top-px p-1 mx-2 relative rounded-b-lg text-center bg-secondary-400 py-0.5 text-xs text-secondary-text leading-[18px] font-normal">
        {
            isLoading ?
                <div className='h-[10px] w-fit px-4 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                : !truncatedBalance ?
                    <span>-</span>
                    : (network && token && truncatedBalance) ?
                        insufficientBalance ?
                            <InsufficientBalance balance={truncatedBalance} onRefresh={mutate} />
                            : outOfGas ?
                                <ReserveGasNote balance={truncatedBalance} />
                                : <span>{truncatedBalance}</span>
                        : null
        }
    </div>
}

const InsufficientBalance: FC<{ balance: string; onRefresh: () => void }> = ({ balance, onRefresh }) => {
    return <Tooltip openOnClick>
        <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-warning-foreground justify-center group/insufficient">
                <InfoIcon className="w-3 h-3 group-hover/insufficient:hidden" />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRefresh();
                    }}
                    className="hidden group-hover/insufficient:block"
                >
                    <RefreshCw className='w-3 h-3 hover:animate-spin' />
                </button>
                <p>{balance}</p>
            </div>
        </TooltipTrigger>
        <TooltipContent showArrow side="top" arrowClasses="fill-secondary-400 [filter:drop-shadow(0px_1px_3px_rgba(0,0,0,0.5))] translate-y-[-1px]" className="shadow-[0px_1px_3px_0px_rgba(0,0,0,0.5)]! bg-secondary-400! border-0! p-3! rounded-xl! max-w-[250px]">
            <div className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-warning-foreground shrink-0 mt-0.5" />

                <div className="flex flex-col gap-1">
                    <p className="text-sm text-primary-text font-medium">
                        <span>Insufficient balance</span>
                    </p>
                    <p className="text-xs text-secondary-text">
                        <span>Tap</span>
                        <span className="font-bold">Max</span>
                        <span>to use your available balance, or refresh to check for new funds</span>
                    </p>
                </div>
            </div>
        </TooltipContent>
    </Tooltip >
}

export default Balance