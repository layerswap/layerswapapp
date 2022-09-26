import roundDecimals from "../components/utils/RoundDecimals";
import { getCurrencyDetails } from "../helpers/currencyHelper";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";
import { SwapType } from "./layerSwapApiClient";

export function GetExchangeFee(currency?: Currency, exchange?: Exchange): number {
    return exchange?.currencies.find(ec => ec.asset === currency?.asset)?.current_withdrawal_fee || 0;
}

export function CalculateFee(amount?: number, currency?: Currency, exchange?: Exchange, network?: CryptoNetwork, swapType?: SwapType): number {
    if (!currency || !exchange) {
        return 0;
    }

    const currencyDetails = getCurrencyDetails(currency, exchange, network, swapType)
    var fee = (currencyDetails?.fee || 0) + currencyDetails?.fee_percentage * amount;
    return Number(fee.toFixed(currencyDetails?.precision));
}

export function CalculateReceiveAmount(amount?: number, currency?: Currency, exchange?: Exchange, network?: CryptoNetwork, swapType?: SwapType) {

    if (!amount) return 0;

    let minAllowedAmount = CalculateMinAllowedAmount(currency, exchange, network, swapType);

    const currencyDetails = getCurrencyDetails(currency, exchange, network, swapType)

    if (amount >= minAllowedAmount) {
        let fee = CalculateFee(amount, currency, exchange, network, swapType);
        var result = amount - fee;
        if (swapType == SwapType.OnRamp) {
            let exchangeFee = GetExchangeFee(currency, exchange);
            result -= exchangeFee;
        }
        return Number(result.toFixed(currencyDetails?.precision));
    }

    return 0;
}

export function CalculateMaxAllowedAmount(currency?: Currency, exchange?: Exchange, network?: CryptoNetwork, swapType?: SwapType) {

    if (!currency) return 0

    const currencyDetails = getCurrencyDetails(currency, exchange, network, swapType)

    if (!currencyDetails) return 0

    return roundDecimals(currencyDetails.max_withdrawal_amount, currency?.usd_price?.toFixed()?.length) || 0
}

export function CalculateMinAllowedAmount(currency?: Currency, exchange?: Exchange, network?: CryptoNetwork, swapType?: SwapType) {

    if (!currency) return 0

    const currencyDetails = getCurrencyDetails(currency, exchange, network, swapType)

    if (!currencyDetails)
        return 0

    return roundDecimals(currencyDetails.min_withdrawal_amount, currency.usd_price?.toFixed()?.length) || 0
}

