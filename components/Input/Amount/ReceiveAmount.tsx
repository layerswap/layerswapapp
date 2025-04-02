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
        <div className="flex flex-col min-w-0 rounded-lg font-semibold border-0 text-[28px] text-primary-text w-full">
            {isFeeLoading ? (
                <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-sm animate-pulse self-center' />
            ) :
                <span className="text-primary-text px-2 text-[28px] leading-normal pb-1 relative w-full">
                    {source_token && destination_token && parsedReceiveAmount > 0 ?
                        <div className="flex items-center">
                            <p>
                                <>{parsedReceiveAmount}</>
                            </p>
                        </div> : <span>0</span>
                    }
                </span>
            }
            <span className="text-base leading-5 font-medium px-2 text-secondary-text">
                ${receiveAmountInUsd ?? 0}
            </span>
        </div>
    </>)
}