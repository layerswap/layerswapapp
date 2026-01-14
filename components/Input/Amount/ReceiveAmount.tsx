import { FC } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { PriceImpact } from "./PriceImpact";
import { calculatePrecision } from "@/components/utils/RoundDecimals";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined
    const quote = fee?.quote

    const receiveAmountPrecision = receive_amount && fee?.quote?.destination_token?.price_in_usd
        ? calculatePrecision(receive_amount, fee.quote.destination_token.price_in_usd, fee.quote.destination_token?.decimals || 2)
        : fee?.quote?.destination_token?.decimals || 2
        
    const fullAmountText = receive_amount && destination_token
        ? `${receive_amount} ${destination_token.symbol}`
        : undefined;

    return (<>
        <div className="flex-col w-full flex min-w-0 font-normal border-0 text-[28px] leading-7 text-primary-text relative truncate">
            <div className="w-full flex items-center justify-start relative">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={clsx(
                            "w-full flex items-center py-[3px]",
                            { "animate-pulse-stronger": isFeeLoading },
                            { "text-secondary-text": !receive_amount }
                        )}>
                            <NumberFlow value={receive_amount || 0} trend={0} format={{ maximumFractionDigits: receiveAmountPrecision }} />
                        </div>
                    </TooltipTrigger>
                    {fullAmountText && (
                        <TooltipContent className="bg-secondary-300! border-secondary-300! text-primary-text!">
                            <p>{fullAmountText}</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            </div>
            <div className="flex items-baseline space-x-2">
                <span className="text-base leading-5 font-medium text-secondary-text h-5">
                    <NumberFlow className="p-0" value={receiveAmountInUsd || 0} prefix="$" format={{ maximumFractionDigits: receiveAmountInUsd ? 2 : 0 }} trend={0} />
                </span>
                <PriceImpact className="h-5 text-base leading-5" quote={quote} refuel={fee?.refuel} />
            </div>
        </div>
    </>)
}