import { FC } from "react";
import { Token } from "../../Models/Network";
import { ArrowRight, Fuel } from "lucide-react";
import { roundDecimals, truncateDecimals } from "../utils/RoundDecimals";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";

type WillReceiveProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}

export const ReceiveAmounts: FC<WillReceiveProps> = ({ source_token, destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const parsedReceiveAmount = truncateDecimals(receive_amount ?? 0, destination_token?.precision);
    const receiveTokenPriceInUsd = resolveTokenUsdPrice(destination_token, fee?.quote)
    const receiveAmountInUsd = receive_amount && receiveTokenPriceInUsd ? (receive_amount * receiveTokenPriceInUsd).toFixed(2) : undefined

    return <div className="w-full h-full mt-3">
        <div className="flex flex-col justify-between w-full px-2 pb-2">
            <span className="block font-normal text-secondary-text text-base leading-5">
                You will receive
            </span>
            {isFeeLoading ? (
                <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse self-center' />
            ) :
                <div className="flex">
                    {
                        source_token && destination_token && Number(parsedReceiveAmount) > 0 ?
                            <div className="flex items-center justify-end">
                                <p className="text-primary-text text-base leading-5 mt-2.5 font-medium">
                                    <>{parsedReceiveAmount}</>
                                    &nbsp;
                                    <span>
                                        {destination_token?.symbol}
                                    </span>
                                    {
                                        receiveAmountInUsd !== undefined && Number(receiveAmountInUsd) > 0 &&
                                        <span className="text-secondary-text text-sm font-medium ml-2">
                                            ${receiveAmountInUsd}
                                        </span>
                                    }
                                </p>
                            </div>
                            : '-'
                    }
                </div>
            }
        </div>
    </div>

}