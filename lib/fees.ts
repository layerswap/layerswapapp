import { SwapType } from "../components/DTOs/SwapFormValues";
import roundDecimals from "../components/utils/RoundDecimals";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";

export function CalculateExchangeFee(amount: number, currency: Currency, exchange: Exchange): number {
    var currencyExchange = currency?.exchanges?.find(e => e.exchange_id == exchange.id);
    if (!currencyExchange)
    {
        return 0;
    }

    var percentageFee = amount * exchange?.fee_percentage;
    
    return currencyExchange.fee + percentageFee;
}

export function CalculateFee(amount: number, currency: Currency, exchange: Exchange, swapType: SwapType): number {
    if (!currency || !exchange)
    {
        return 0;
    }

    var fee =  currency.fee;
    if (swapType == "onramp")
    {
        fee += CalculateExchangeFee(amount, currency, exchange);
    }

    return Number(fee.toFixed(currency?.precision));
}

export function CalculateReceiveAmount(amount: number, currency: Currency, exchange: Exchange, swapType: SwapType) {

    if (!amount) return 0;

    let fee = CalculateFee(amount, currency, exchange, swapType);

    let receive_amount = 0;
    let minAllowedAmount = CalculateMinAllowedAmount(currency, exchange, swapType);

    if (amount >= minAllowedAmount)
    {
        var result = amount - fee;
        receive_amount = Number(result.toFixed(currency?.precision));

        if (swapType == 'onramp'){
            var exFee = CalculateExchangeFee(amount, currency, exchange);
            receive_amount -= exFee;
        }
    }

    return receive_amount;
}

export function CalculateMaxAllowedAmount(currency: Currency, swapType: string) {
    return swapType == "onramp" ? currency?.max_amount : currency?.off_ramp_max_amount;
}
export function CalculateMinAllowedAmount(currency: Currency, exchange: Exchange, swapType: string) {
    let exchangeMinWithdrawalAmount = currency?.exchanges.find(ce => ce.exchange_id === exchange.id).min_withdrawal_amount;
    let roundedExchangeMinWithdrawalAmount = exchangeMinWithdrawalAmount ? roundDecimals(exchangeMinWithdrawalAmount, currency?.price_in_usdt.toFixed().length) : null;
    let minAllowedAmount = roundedExchangeMinWithdrawalAmount ?? (swapType == "onramp" ? currency?.min_amount : currency?.off_ramp_min_amount);
    return minAllowedAmount;
}
