import { FC } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import NumberFlow, { type Value } from "@number-flow/react";
import clsx from "clsx";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ source_token, destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount

    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined

    return (<>
        <div className="flex flex-col min-w-0 rounded-lg font-normal border-0 text-[28px] leading-7 text-primary-text w-full relative truncate">
            <div className="h-[48px] flex items-center justify-start w-full relative">
                <div className={clsx(
                    "w-full flex items-center",
                    { "animate-pulse-strong": isFeeLoading }
                )}>
                    <NumberFlow value={receive_amount || 0} trend={0} format={{ maximumFractionDigits: fee?.quote.destination_token?.decimals || 2 }} />
                </div>
            </div>
            <span className="text-base leading-5 font-medium text-secondary-text">
                <NumberFlow value={receiveAmountInUsd || 0} format={{ style: 'currency', currency: 'USD' }} trend={0} />
            </span>
        </div>
    </>)
}