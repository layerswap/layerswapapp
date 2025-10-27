import { FC } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { PriceImpact } from "./PriceImpact";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ source_token, destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined
    const quote = fee?.quote
    const refuelInUsd = fee?.refuel?.amount_in_usd

    return (<>
        <div className="flex flex-col min-w-0 font-normal border-0 text-[28px] leading-7 text-primary-text w-full relative truncate">
            <div className="flex items-center justify-start w-full relative">
                <div className={clsx(
                    "w-full flex items-center py-[3px] pr-3",
                    { "animate-pulse-stronger": isFeeLoading },
                    { "text-secondary-text": !receive_amount }
                )}>
                    <NumberFlow value={receive_amount || 0} trend={0} format={{ maximumFractionDigits: fee?.quote.destination_token?.decimals || 2 }} />
                </div>
            </div>
            <div className="flex items-baseline space-x-2">
                <span className="text-base leading-5 font-medium text-secondary-text h-5">
                    <NumberFlow className="p-0" value={receiveAmountInUsd || 0} format={{ style: 'currency', currency: 'USD', maximumFractionDigits: receiveAmountInUsd ? 2 : 0 }} trend={0} />
                </span>
                <PriceImpact className="h-5 text-base leading-5" bridgeFee={quote?.blockchain_fee} destinationTokenPriceUsd={quote?.destination_token?.price_in_usd} receiveAmount={quote?.receive_amount} requestedAmount={quote?.requested_amount} serviceFee={quote?.service_fee} sourceTokenPriceUsd={quote?.source_token?.price_in_usd} refuelInUsd={refuelInUsd} />
            </div>
        </div>
    </>)
}