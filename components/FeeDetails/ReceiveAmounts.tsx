import { FC } from "react";
import { Layer } from "../../Models/Layer";
import { GetDefaultAsset } from "../../helpers/settingsHelper";
import { CaluclateRefuelAmount } from "../../lib/fees";
import { truncateDecimals } from "../utils/RoundDecimals";
import { NetworkCurrency } from "../../Models/CryptoNetwork";
import { Fee } from "../../context/feeContext";

type WillReceiveProps = {
    receive_amount?: number;
    currency?: NetworkCurrency | null;
    to: Layer | undefined | null;
    refuel: boolean;
    fee: Fee
}
export const ReceiveAmounts: FC<WillReceiveProps> = ({ receive_amount, currency, to, refuel, fee }) => {
    const parsedReceiveAmount = parseFloat(receive_amount?.toFixed(currency?.precision) || "")

    const refuelCalculations = CaluclateRefuelAmount({
        refuelEnabled: refuel,
        currency,
        to
    })
    const { refuelAmountInSelectedCurrency } = refuelCalculations
    const destinationNetworkCurrency = (to && currency) ? GetDefaultAsset(to, currency.asset) : null

    const destinationAsset = to?.assets?.find(c => c?.asset === currency?.asset)
    const receiveAmountInUsd = receive_amount && destinationAsset ? (destinationAsset?.usd_price * receive_amount).toFixed(2) : undefined

    const calculatedReceiveAmount = refuel ?
        parseFloat(receive_amount && (receive_amount - refuelAmountInSelectedCurrency)?.toFixed(currency?.precision) || "")
        : parsedReceiveAmount

    return <div className="flex items-center justify-between w-full">
        <span className="md:font-semibold text-sm md:text-base text-secondary-text leading-8 md:leading-8 flex-1">
            <span>
                You will receive
            </span>
        </span>
        <div className='flex items-end flex-col'>
            <span className="text-sm md:text-base">
                {
                    calculatedReceiveAmount > 0 ?
                        <div className="font-semibold md:font-bold text-right leading-8">
                            <div className="flex items-center">
                                <p>
                                    <>{calculatedReceiveAmount}</>
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
                            {refuel && <Refuel
                                currency={currency}
                                to={to}
                                refuel={refuel}
                            />}
                        </div>
                        : '-'
                }
            </span>
        </div>
    </div >
}

type RefuelProps = {
    currency?: NetworkCurrency | null;
    to?: Layer | null;
    refuel: boolean
}
export const Refuel: FC<RefuelProps> = ({ to, currency, refuel }) => {
    const destination_native_asset = to?.assets.find(c => c.is_native)
    const refuelCalculations = CaluclateRefuelAmount({
        refuelEnabled: refuel,
        currency,
        to
    })
    const { refuelAmountInNativeCurrency } = refuelCalculations
    const truncated_refuel = truncateDecimals(refuelAmountInNativeCurrency, destination_native_asset?.precision)

    return <>
        {
            truncated_refuel > 0 ? <p className='text-[12px] text-secondary-text/50 leading-5'>
                <>+</> <span>{truncated_refuel} {destination_native_asset?.asset}</span>
            </p>
                : null
        }
    </>

}