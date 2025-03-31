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
        <div className="flex flex-col w-full bg-secondary-700 rounded-lg">
            {isFeeLoading ? (
                <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-sm animate-pulse self-center' />
            ) :
                <span className="text-primary-text px-2 w-full text-[28px] leading-normal pb-1">
                    {source_token && destination_token && parsedReceiveAmount > 0 ?
                        <div className="flex items-center justify-end">
                            <p>
                                <>{parsedReceiveAmount}</>
                                &nbsp;
                                <span>
                                    {destination_token?.symbol}
                                </span>
                            </p>
                        </div> : 0
                    }
                </span>
            }
            <span className="text-base leading-5 font-medium px-2 text-secondary-text">
                ${receiveAmountInUsd || 0}
            </span>
        </div >
    </>)
}