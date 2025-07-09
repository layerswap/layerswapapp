import { FC } from "react";
import { Token } from "../../Models/Network";
import { ArrowRight, Fuel } from "lucide-react";
import { roundDecimals, truncateDecimals } from "../utils/RoundDecimals";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";

type WillReceiveProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    refuel: boolean;
    fee: Quote | undefined;
    onButtonClick?: () => void;
    isFeeLoading: boolean;
}

export const ReceiveAmounts: FC<WillReceiveProps> = ({ source_token, destination_token, refuel, fee, onButtonClick, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const parsedReceiveAmount = truncateDecimals(receive_amount ?? 0, destination_token?.precision);

    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined

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
        {/* {
            refuel && fee?.refuel?.amount ?
                <p onClick={() => onButtonClick()} className='flex cursor-pointer justify-end rounded-md gap-1 items-center text-xs text-primary-buttonTextColor leading-8 md:leading-none font-semibold'>
                    <span>{(fee?.quote?.refuel_in_source && source_token) ? roundDecimals(fee?.quote?.refuel_in_source, source_token?.precision) : '-'} {source_token?.symbol}</span>
                    <span><ArrowRight className="h-3 w-3" /></span> <span>{fee?.refuel?.amount} {fee?.refuel?.token?.symbol}</span> <span className="bg-primary/20 p-1 rounded-md"><Fuel className="h-3 w-3 text-primary" /></span>
                </p>
                :
                <></>
        } */}
    </div>

}