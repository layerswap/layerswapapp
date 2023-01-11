import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import roundDecimals from "../components/utils/RoundDecimals";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";
import { SwapType } from "./layerSwapApiClient";

export function GetExchangeFee(asste?: string, exchange?: Exchange): number {
    return exchange?.currencies.find(ec => ec.asset === asste)?.withdrawal_fee || 0;
}
export function CalculateMinimalAuthorizeAmount(usd_price: number, amount: number) {
    return Math.ceil((usd_price * amount) + (usd_price * amount * 0.02))
}
export function CalculateFee(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]): number {
    const { currency, exchange, network, swapType } = swapFormData|| {}

    if (!currency || !exchange || !network)
        return 0;

    const exchangeCurrency = exchange?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset)
    const destinationNetwork = swapType === SwapType.OnRamp ? network.baseObject : allNetworks.find(n => n.internal_name === exchangeCurrency?.network)
    const destinationNetworkCurrency = destinationNetwork?.currencies.find(c => c.asset === currency.baseObject?.asset)

    if (!destinationNetworkCurrency)
        return 0

    return destinationNetworkCurrency.fee;
}

export function CalculateReceiveAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]) {

    const amount = Number(swapFormData?.amount)
    if (!amount) return 0;

    let minAllowedAmount = CalculateMinAllowedAmount(swapFormData, allNetworks);

    if (amount >= minAllowedAmount) {
        let fee = CalculateFee(swapFormData, allNetworks);
        var result = amount - fee;
        if (swapFormData.swapType == SwapType.OnRamp) {
            let exchangeFee = GetExchangeFee(swapFormData.currency?.baseObject?.asset, swapFormData.exchange?.baseObject);
            result -= exchangeFee;
        }
        return Number(result.toFixed(swapFormData.currency?.baseObject?.precision));
    }

    return 0;
}

export function CalculateMaxAllowedAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]) {
    const { currency, exchange, network, swapType } = swapFormData|| {}

    if (!currency || !exchange || !network) return 0

    const exchangeCurrency = exchange?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset)
    const destinationNetwork = swapType === SwapType.OnRamp ? network.baseObject : allNetworks.find(n => n.internal_name === exchangeCurrency?.network)
    const destinationNetworkCurrency = destinationNetwork?.currencies.find(c => c.asset === currency.baseObject?.asset)

    const maxAmount = destinationNetworkCurrency?.max_withdrawal_amount || 0

    return roundDecimals(maxAmount, currency.baseObject?.usd_price?.toFixed()?.length) || 0
}

export function CalculateMinAllowedAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]) {

    const { currency, exchange, network, swapType } = swapFormData|| {}
    if (!currency || !exchange || !network) return 0

    const exchangeCurrency = exchange?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset)
    const destinationNetwork = swapType === SwapType.OnRamp ? network.baseObject : allNetworks.find(n => n.internal_name === exchangeCurrency?.network)
    const destinationNetworkCurrency = destinationNetwork?.currencies.find(c => c.asset === currency.baseObject?.asset)

    if (!destinationNetworkCurrency || !exchangeCurrency) return 0

    const minAmount = destinationNetworkCurrency?.min_withdrawal_amount || 0

    const fee = CalculateFee(swapFormData, allNetworks)

    const double_fee = fee * 2

    let final_min_amount: number;

    if (swapType == SwapType.OnRamp) {
        final_min_amount = Math.max(minAmount + fee, double_fee)
        final_min_amount += GetExchangeFee(currency.baseObject?.asset, exchange.baseObject)
    }
    else
        final_min_amount = (minAmount + double_fee)

    return roundDecimals(final_min_amount, currency.baseObject?.usd_price?.toFixed()?.length) || 0
}