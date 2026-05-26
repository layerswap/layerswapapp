import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useBalance } from "@/lib/balances/useBalance";
import { useMemo } from "react";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import useOutOfGas from "@/lib/gases/useOutOfGas";
import BalanceWarningTooltip from "@/components/Pages/Swap/Form/SecondaryComponents/ReserveGasNote";
import { QuoteTokenPrices } from "@/hooks/useFee";

const Balance = ({ values, direction, minAllowedAmount, maxAllowedAmount, quoteTokenPrices }: { values: SwapFormValues, direction: string, minAllowedAmount?: number, maxAllowedAmount?: number, quoteTokenPrices?: QuoteTokenPrices }) => {

    const { to, fromAsset: fromCurrency, toAsset: toCurrency, from, destination_address } = values
    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balances, isLoading, mutate } = useBalance(address, network, { refreshInterval: 20000, dedupeInterval: 20000 })

    const tokenBalance = useMemo(() => balances?.find(
        b => b?.network === network?.name && b?.token === token?.symbol
    ), [balances, network?.name, token?.symbol])
    const balanceAmount = useMemo(() => Number(tokenBalance?.amount), [tokenBalance?.amount])
    const truncatedBalance = useMemo(() =>
        tokenBalance?.amount !== undefined ? truncateDecimals(tokenBalance?.amount, token?.precision) : '',
        [tokenBalance?.amount, token?.precision]
    )
    const tokenPriceInUsd = useMemo(() =>
        quoteTokenPrices ? resolveTokenUsdPrice(token, quoteTokenPrices) : token?.price_in_usd,
        [token, quoteTokenPrices]
    )
    const displayedBalance = useMemo(() => {
        const balanceInUsd = isUsdMode && typeof tokenPriceInUsd === 'number' && tokenPriceInUsd > 0 && !isNaN(balanceAmount)
            ? formatUsd(balanceAmount * tokenPriceInUsd)
            : undefined
        return balanceInUsd ?? truncatedBalance
    }, [isUsdMode, tokenPriceInUsd, balanceAmount, truncatedBalance])

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

    const insufficientBalance = balanceAmount >= 0 && balanceAmount < Number(values.amount) && values.depositMethod === 'wallet' && isFromDirection

    if (!isLoading && !(network && token && tokenBalance))
        return null;

    return <div className="min-w-4/5 -top-px p-1 mx-2 relative rounded-b-lg text-center bg-secondary-400 py-0.5 text-xs text-secondary-text leading-[18px] font-normal">
        {
            isLoading ?
                <div className='h-[10px] w-fit px-4 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                : !displayedBalance ?
                    <span>-</span>
                    : (network && token && displayedBalance) ?
                        insufficientBalance ?
                            <BalanceWarningTooltip
                                balance={displayedBalance}
                                title="Insufficient balance"
                                description={<span> <span>Tap</span> <span className="font-bold">Max</span> <span>to use your available balance, or refresh to check for new funds</span> </span>
                                }
                                onRefresh={mutate}
                            />
                            : isFromDirection && outOfGas ?
                                <BalanceWarningTooltip
                                    balance={displayedBalance}
                                    title="Insufficient balance for gas"
                                    description="Your total balance must cover the transfer amount + gas fee. Tap Max to calculate the limit."
                                />
                                : <span>{displayedBalance}</span>
                        : null
        }
    </div >
}

export default Balance
