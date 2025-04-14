import { FC } from "react";
import { Token } from "../../../Models/Network";
import { Quote } from "../../../lib/layerSwapApiClient";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ source_token, destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const parsedReceiveAmount = parseFloat(receive_amount?.toFixed(destination_token?.precision) || "")

    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined

    return (<>
        <div className="flex flex-col min-w-0 rounded-lg font-normal border-0 text-[28px] text-primary-text w-full relative">
            <div className="h-[36px] px-2 flex items-center justify-start w-full relative">
                {isFeeLoading ? (
                    <div className="h-full w-full flex items-center">
                        <div className="h-[12px] w-16 bg-gray-500 rounded-sm animate-pulse" />
                    </div>
                ) : (
                    <div className="w-full flex items-center">
                        {source_token && destination_token && parsedReceiveAmount > 0 ? (
                            <p>{parsedReceiveAmount}</p>
                        ) : (
                            <span>0</span>
                        )}
                    </div>
                )}
            </div>
            <span className="text-base leading-5 font-medium px-2 text-secondary-text">
                {`$${receiveAmountInUsd ?? 0}`}
            </span>
        </div>
    </>)
}