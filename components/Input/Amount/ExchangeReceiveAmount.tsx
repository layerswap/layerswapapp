import { FC } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ExchangeReceiveAmount: FC<ReceiveAmountProps> = ({ destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined

    return (<>
        <div className="w-full flex min-w-0 font-normal border-0 text-xl text-primary-text relative truncate items-baseline flex-row">
            <div className="flex items-center justify-start relative w-fit">
                <div className={clsx(
                    "w-full flex items-center py-[3px] pr-2",
                    { "animate-pulse-stronger": isFeeLoading },
                    { "text-secondary-text": !receive_amount }
                )}>
                    <NumberFlow value={receive_amount || 0} trend={0} format={{ maximumFractionDigits: fee?.quote.destination_token?.decimals || 2 }} />
                    <span className="ml-1">{destination_token?.symbol}</span>
                </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-1.5">
                <span className="text-sm leading-4 font-medium text-secondary-text h-5">
                    <NumberFlow className="p-0" prefix="$" value={receiveAmountInUsd || 0} format={{ maximumFractionDigits: receiveAmountInUsd ? 2 : 0 }} trend={0} />
                </span>
            </div>
        </div>
    </>)
}
