import { FC, useMemo } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { PriceImpact } from "./PriceImpact";
import { useUsdModeStore } from "@/stores/usdModeStore";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ destination_token, fee, isFeeLoading }) => {
    const { isUsdMode } = useUsdModeStore();
    const receive_amount = fee?.quote.receive_amount
    const receiveAmountInUsd = useMemo(() => {
        if (!receive_amount || !destination_token || !fee.quote?.destination_token?.price_in_usd) return undefined;
        return (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2);
    }, [receive_amount, destination_token, fee?.quote?.destination_token?.price_in_usd]);
    const quote = fee?.quote
    const tokenDecimals = fee?.quote.destination_token?.decimals || 2

    const primaryEmpty = isUsdMode ? !receiveAmountInUsd : !receive_amount

    return (
        <div className="flex-col w-full flex min-w-0 font-normal border-0 text-[28px] leading-7 text-primary-text relative truncate">
            <div className="w-full flex items-center justify-start relative">
                <div className={clsx(
                    "w-full flex items-center py-[3px] pr-3",
                    { "animate-pulse-stronger": isFeeLoading },
                    { "text-secondary-text": primaryEmpty }
                )}>
                    {isUsdMode ? <>
                        <NumberFlow prefix="$" value={Number(receiveAmountInUsd) || 0} trend={0} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </> : (
                        <NumberFlow value={receive_amount || 0} trend={0} format={{ maximumFractionDigits: tokenDecimals }} />
                    )}
                </div>
            </div>
            <div className="flex items-baseline space-x-2">
                <span className="text-base leading-5 font-medium text-secondary-text h-5">
                    {isUsdMode ? <>
                        <NumberFlow className="p-0" suffix={` ${destination_token?.symbol}`} value={receive_amount || 0} trend={0} format={{ maximumFractionDigits: tokenDecimals }} />
                    </> : (
                        <NumberFlow className="p-0" value={receiveAmountInUsd || 0} prefix="$" format={{ maximumFractionDigits: receiveAmountInUsd ? 2 : 0 }} trend={0} />
                    )}
                </span>
                <PriceImpact className="h-5 text-base leading-5" quote={quote} refuel={fee?.refuel} />
            </div>
        </div>
    )
}
