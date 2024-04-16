import { FC } from "react";
import { Token } from "../../Models/Network";
import { Fuel } from "lucide-react";
import { Quote } from "../../lib/layerSwapApiClient";

type WillReceiveProps = {
    destination_token: Token | undefined;
    refuel: boolean;
    fee: Quote | undefined;
    onButtonClick: () => void;
    isFeeLoading: boolean;
}
export const ReceiveAmounts: FC<WillReceiveProps> = ({ destination_token, refuel, fee, onButtonClick, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const parsedReceiveAmount = parseFloat(receive_amount?.toFixed(destination_token?.precision) || "")

    const receiveAmountInUsd = receive_amount && destination_token ? (destination_token?.price_in_usd * receive_amount).toFixed(2) : undefined

    return <div className="flex items-start justify-between w-full">
        <span className="md:font-semibold text-sm md:text-base text-primary-buttonTextColor leading-8 md:leading-8 flex-1">
            <span>
                You will receive
            </span>
        </span>
        {isFeeLoading ? (
            <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-sm animate-pulse self-center' />
        ) :
            <div className='flex items-end flex-col'>
                <span className="text-sm md:text-base">
                    {
                        parsedReceiveAmount > 0 ?
                            <div className="font-semibold md:font-bold text-right leading-8">
                                <div className="flex items-center">
                                    <p>
                                        <>{parsedReceiveAmount}</>
                                        &nbsp;
                                        <span>
                                            {destination_token?.symbol}
                                        </span>
                                        {
                                            receiveAmountInUsd !== undefined && Number(receiveAmountInUsd) > 0 &&
                                            <span className="text-secondary-text text-xs font-medium ml-1 block md:inline-block">
                                                (${receiveAmountInUsd})
                                            </span>
                                        }
                                    </p>
                                </div>
                                {
                                    refuel ?
                                        <p onClick={() => onButtonClick()} className='flex cursor-pointer justify-end rounded-md gap-1 items-center text-xs text-primary-buttonTextColor leading-8 md:leading-none font-semibold'>
                                            <span>+</span> <span>{fee?.refuel?.amount} {fee?.refuel?.token?.symbol}</span> <span className="bg-primary/20 p-1 rounded-md"><Fuel className="h-3 w-3 text-primary" /></span>
                                        </p>
                                        :
                                        <></>
                                }
                            </div>
                            : '-'
                    }
                </span>
            </div>
        }
    </div>
}