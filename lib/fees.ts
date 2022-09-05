import { SwapType } from "../components/DTOs/SwapFormValues";
import roundDecimals from "../components/utils/RoundDecimals";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";

export function GetExchangeFee(currency: Currency, exchange: Exchange): number {
    var currencyExchange = currency?.exchanges?.find(e => e.exchange_id == exchange.id);
    if (!currencyExchange) {
        return 0;
    }

    return currencyExchange.fee;
}

function CalcualteExchangePercentageFee(amount: number, exchange: Exchange) {
    return amount * exchange?.fee_percentage;
}

export function CalculateFee(amount: number, currency: Currency, exchange: Exchange, swapType: SwapType): number {
    if (!currency || !exchange) {
        return 0;
    }

    var fee = currency.fee + CalcualteExchangePercentageFee(amount, exchange);
    return Number(fee.toFixed(currency?.precision));
}

export function CalculateReceiveAmount(amount: number, currency: Currency, exchange: Exchange, swapType: SwapType) {

    if (!amount) return 0;

    let minAllowedAmount = CalculateMinAllowedAmount(currency, exchange, swapType);

    if (amount >= minAllowedAmount) {
        let fee = CalculateFee(amount, currency, exchange, swapType);
        var result = amount - fee;
        if (swapType == 'onramp') {
            let exchangeFee = GetExchangeFee(currency, exchange);
            result -= exchangeFee;
        }
        return Number(result.toFixed(currency?.precision));
    }

    return 0;
}

export function CalculateMaxAllowedAmount(currency: Currency, swapType: string) {
    return (swapType == "onramp" ? currency?.max_amount : currency?.off_ramp_max_amount) || 0;
}

export function CalculateMinAllowedAmount(currency: Currency, exchange: Exchange, swapType: string) {
    let exchangeMinWithdrawalAmount = currency?.exchanges.find(ce => ce.exchange_id === exchange.id).min_withdrawal_amount;
    exchangeMinWithdrawalAmount ??= swapType == "onramp" ? currency?.min_amount : currency?.off_ramp_min_amount;
    return roundDecimals(exchangeMinWithdrawalAmount, currency?.price_in_usdt.toFixed().length) || 0;
}

