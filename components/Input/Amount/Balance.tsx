import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useBalance } from "@/lib/balances/useBalance";
import useOutOfGas from "@/lib/gases/useOutOfGas";
import BalanceWarningTooltip from "@/components/ReserveGasNote";

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

    const isFromDirection = direction === 'from'

    const { outOfGas } = useOutOfGas({
        address: isFromDirection ? selectedSourceAccount?.address : undefined,
        network: isFromDirection ? values.from : undefined,
        token: isFromDirection ? values.fromAsset : undefined,
        amount: isFromDirection ? values.amount : undefined,
        balances: isFromDirection ? balances : undefined,
        minAllowedAmount,
        maxAllowedAmount
    })

    const insufficientBalance = Number(tokenBalance?.amount) >= 0 && Number(tokenBalance?.amount) < Number(values.amount) && values.depositMethod === 'wallet' && isFromDirection

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
                            <BalanceWarningTooltip
                                balance={truncatedBalance}
                                title="Insufficient balance"
                                description={<>Tap <span className="font-bold">Max</span> to use your available balance, or refresh to check for new funds</>}
                                onRefresh={mutate}
                            />
                            : isFromDirection && outOfGas ?
                                <BalanceWarningTooltip
                                    balance={truncatedBalance}
                                    title="Insufficient balance for gas"
                                    description="Your total balance must cover the transfer amount + gas fee. Tap Max to calculate the limit."
                                />
                                : <span>{truncatedBalance}</span>
                        : null
        }
    </div>
}

export default Balance
