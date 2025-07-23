import { FC } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { AnimatedValue } from "@/components/Common/AnimatedValue";
import clsx from "clsx";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
    isUpdatingValues?: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ source_token, destination_token, fee, isFeeLoading, isUpdatingValues }) => {
    const receive_amount = fee?.quote.receive_amount
    const parsedReceiveAmount = receive_amount && truncateDecimals(receive_amount, destination_token?.decimals)

    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined

    return (<>
        <div className="flex flex-col min-w-0 rounded-lg font-normal border-0 text-[28px] leading-7 text-primary-text w-full relative truncate">
            <div className="h-[48px] flex items-center justify-start w-full relative">
                {isFeeLoading ? (
                    <div className="h-full w-full flex items-center">
                        <div className="h-[28px] w-24 bg-gray-500 rounded-sm animate-pulse" />
                    </div>
                ) : (
                    <div className={clsx(
                        "w-full flex items-center",
                        { "animate-pulse-brightness": isUpdatingValues }
                    )}>
                        <AnimatedValue
                            value={
                                source_token && destination_token && Number(parsedReceiveAmount) > 0
                                    ? parsedReceiveAmount
                                    : "0"
                            } />
                    </div>
                )}
            </div>
            <span className="text-base leading-5 font-medium text-secondary-text">
                {`$${receiveAmountInUsd ?? 0}`}
            </span>
        </div>
    </>)
}