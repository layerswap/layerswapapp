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
    if (!currency || !exchange || !network)
        return 0;

    const exchangeCurrency = exchange.currencies.find(c => c.asset === currency.asset)
    const networkCurrency = network.currencies.find(c => c.asset === currency.asset)

    const fee = swapType === SwapType.OnRamp ?
        Number((amount * exchangeCurrency.fee_percentage + (exchangeCurrency.fee || 0)).toFixed(exchangeCurrency?.precision))
        : Number((amount * networkCurrency.fee_percentage + (networkCurrency.fee || 0)).toFixed(networkCurrency?.precision))

    return fee;
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

    if (!currency || !exchange || !network) return 0
    const exchangeCurrency = exchange.currencies.find(c => c.asset === currency.asset)
    const networkCurrency = network.currencies.find(c => c.asset === currency.asset)

    const maxAmount = Math.min(exchangeCurrency?.max_withdrawal_amount, networkCurrency?.max_withdrawal_amount) || 0

    return roundDecimals(maxAmount, currency?.usd_price?.toFixed()?.length) || 0
}

export function CalculateMinAllowedAmount(currency?: Currency, exchange?: Exchange, network?: CryptoNetwork, swapType?: SwapType) {

    if (!currency || !exchange || !network) return 0
    const exchangeCurrency = exchange.currencies.find(c => c.asset === currency.asset)
    const networkCurrency = network.currencies.find(c => c.asset === currency.asset)

    const fee = swapType === SwapType.OnRamp ? exchangeCurrency.fee : networkCurrency.fee

    const maxAmount = Math.max(exchangeCurrency?.min_withdrawal_amount + exchangeCurrency.fee, networkCurrency?.min_withdrawal_amount + networkCurrency.fee, 2 * fee) || 0
    return roundDecimals(maxAmount, currency.usd_price?.toFixed()?.length) || 0
}
