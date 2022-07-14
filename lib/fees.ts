import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";

export function exchangeFee(currency: Currency, exchange: Exchange): number {
    return currency?.exchanges?.find(e => e.exchange_id == exchange.id)?.fee || 0;
}

export function calculateFee(amount: number, currency: Currency, exchange: Exchange): number {

    var exchangeFee = Number(amount?.toString()?.replace(",", ".")) * exchange?.fee_percentage;
    var overallFee = currency?.fee + exchangeFee;

    return overallFee || 0;
}

export function CalculateReceiveAmount(amount: number, currency: Currency, exchange: Exchange) {

    let fee = amount ? Number(calculateFee(Number(amount), currency, exchange)?.toFixed(currency?.precision)) : 0;

    let receive_amount = 0;
    let fee_amount = Number(amount?.toString()?.replace(",", "."));
    if (fee_amount >= currency?.min_amount) {
        var exFee = exchangeFee(currency, exchange);
        var result = fee_amount - fee - exFee;
        receive_amount = Number(result.toFixed(currency?.precision));
    }
    return receive_amount
}