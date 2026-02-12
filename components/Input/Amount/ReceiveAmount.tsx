import { FC } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { PriceImpact } from "./PriceImpact";
import { useSwitchUsdToken } from "@/context/switchUsdToken";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined
    const quote = fee?.quote
    const { isUsdPrimary } = useSwitchUsdToken()

    const tokenAmount = <NumberFlow value={receive_amount || 0} suffix={` ${destination_token?.symbol}`} trend={0} format={{ maximumFractionDigits: fee?.quote.destination_token?.decimals || 2 }} />

    const usdAmount = <NumberFlow className="p-0" value={receiveAmountInUsd || 0} prefix="$" format={{ maximumFractionDigits: receiveAmountInUsd ? 2 : 0 }} trend={0} />

    return (<>
        <div className="flex-col w-full flex min-w-0 font-normal border-0 text-[28px] leading-7 text-primary-text relative truncate">
            <div className="w-full flex items-center justify-start relative">
                <div className={clsx(
                    "w-full flex items-center py-[3px] pr-3",
                    { "animate-pulse-stronger": isFeeLoading },
                    { "text-secondary-text": !receive_amount }
                )}>
                    {isUsdPrimary ? usdAmount : tokenAmount}
                </div>
            </div>
            <div className="flex items-baseline space-x-2">
                <div className="flex items-center gap-1">
                    <span className="text-base leading-5 font-medium text-secondary-text ">
                        {isUsdPrimary ? tokenAmount : usdAmount}
                    </span>
                </div>
                <PriceImpact className="h-5 text-base leading-5" quote={quote} refuel={fee?.refuel} />
            </div>
        </div>
    </>)
}