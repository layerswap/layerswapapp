import { FC } from "react";
import { Currency } from "../../../Models/Currency";
import { Layer } from "../../../Models/Layer";
import { GetDefaultNetwork, GetNetworkCurrency } from "../../../helpers/settingsHelper";
import { CaluclateRefuelAmount } from "../../../lib/fees";
import { truncateDecimals } from "../../utils/RoundDecimals";

type WillReceiveProps = {
    receive_amount?: number;
    currency?: Currency | null;
    to: Layer | undefined | null;
    currencies: Currency[];
    refuel: boolean
}
export const ReceiveAmounts: FC<WillReceiveProps> = ({ receive_amount, currency, to, currencies, refuel }) => {
    const parsedReceiveAmount = parseFloat(receive_amount?.toFixed(currency?.precision) || "")
    const destinationNetworkCurrency = (to && currency) ? GetNetworkCurrency(to, currency.asset) : null

    return <>
        <span className="md:font-semibold text-sm md:text-base text-secondary-text leading-8 md:leading-8 flex-1">
            You will receive
        </span>
        <div className='flex items-center space-x-2'>
            <span className="text-sm md:text-base">
                {
                    parsedReceiveAmount > 0 ?
                        <div className="font-semibold md:font-bold text-right leading-4">
                            <div className="space-x-1">
                                <span>{parsedReceiveAmount}</span>
                                <span>
                                    {destinationNetworkCurrency?.name}
                                </span>
                            </div>
                            {refuel && <Refuel
                                currencies={currencies}
                                currency={currency}
                                to={to}
                                refuel={refuel}
                            />}
                        </div>
                        : '-'
                }
            </span>
        </div>
    </>
}
type RefuelProps = {
    currency?: Currency | null;
    to?: Layer | null;
    currencies: Currency[];
    refuel: boolean
}
export const Refuel: FC<RefuelProps> = ({ to, currency, currencies, refuel }) => {
    const destination_native_asset = GetDefaultNetwork(to, currency?.asset)?.native_currency
    const refuel_native_currency = currencies.find(c => c.asset === destination_native_asset)
    const refuelCalculations = CaluclateRefuelAmount({
        allCurrencies: currencies,
        refuelEnabled: refuel,
        currency,
        to
    })
    const { refuelAmountInNativeCurrency } = refuelCalculations
    const truncated_refuel = truncateDecimals(refuelAmountInNativeCurrency, refuel_native_currency?.precision)

    return <>
        {
            truncated_refuel > 0 ? <p className='text-[12px] text-slate-300'>
                <>+</> <span>{truncated_refuel} {destination_native_asset}</span>
            </p>
                : null
        }
    </>

}