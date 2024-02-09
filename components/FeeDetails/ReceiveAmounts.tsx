import { FC } from "react";
import { Layer } from "../../Models/Layer";
import { GetDefaultAsset } from "../../helpers/settingsHelper";
import { NetworkCurrency } from "../../Models/CryptoNetwork";
import { Fee } from "../../context/feeContext";

type WillReceiveProps = {
    currency?: NetworkCurrency | null;
    to: Layer | undefined | null;
    refuel: boolean;
    fee: Fee
}
export const ReceiveAmounts: FC<WillReceiveProps> = ({ currency, to, refuel, fee }) => {
    const receive_amount = fee.walletReceiveAmount
    const parsedReceiveAmount = parseFloat(fee.walletReceiveAmount?.toFixed(currency?.precision) || "")
    const destinationNetworkCurrency = (to && currency) ? GetDefaultAsset(to, currency.asset) : null

    const destinationAsset = to?.assets?.find(c => c?.asset === currency?.asset)
    const destinationNativeAsset = to?.assets.find(a => a.is_native)
    const receiveAmountInUsd = receive_amount && destinationAsset ? (destinationAsset?.usd_price * receive_amount).toFixed(2) : undefined

    return <div className="flex items-center justify-between w-full">
        <span className="md:font-semibold text-sm md:text-base text-secondary-text leading-8 md:leading-8 flex-1">
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
                                        {destinationNetworkCurrency?.asset}
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
                                    <p className='text-[12px] text-secondary-text/50 leading-8'>
                                        <>+</> <span>{fee.refuelAmount} {destinationNativeAsset?.asset}</span>
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