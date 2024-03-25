import { FC } from "react";
import { CryptoNetwork, Token } from "../../Models/Network";
import { Fuel } from "lucide-react";
import { Quote } from "../../lib/layerSwapApiClient";

type WillReceiveProps = {
    currency?: Token | null;
    to: CryptoNetwork | undefined | null;
    refuel: boolean;
    fee: Quote | undefined
    onButtonClick: () => void
}
export const ReceiveAmounts: FC<WillReceiveProps> = ({ currency, to, refuel, fee, onButtonClick }) => {
    const receive_amount = fee?.quote.receive_amount
    const parsedReceiveAmount = parseFloat(receive_amount?.toFixed(currency?.precision) || "")

    const destinationAsset = to?.tokens?.find(c => c?.symbol === currency?.symbol)
    const receiveAmountInUsd = receive_amount && destinationAsset ? (destinationAsset?.price_in_usd * receive_amount).toFixed(2) : undefined

    return <div className="flex items-start justify-between w-full">
        <span className="md:font-semibold text-sm md:text-base text-primary-buttonTextColor leading-8 md:leading-8 flex-1">
            <span>
                You will receive
            </span>
        </span>
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
                                        {currency?.symbol}
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
                                        <span>+</span> <span>{fee?.refuel.amount} {fee?.refuel.token?.symbol}</span> <span className="bg-primary/20 p-1 rounded-md"><Fuel className="h-3 w-3 text-primary" /></span>
                                    </p>
                                    :
                                    <></>
                            }
                        </div>
                        : '-'
                }
            </span>
        </div>
    </div>
}