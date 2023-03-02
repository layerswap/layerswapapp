import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import roundDecimals from "../components/utils/RoundDecimals";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";
import KnownInternalNames from "./knownIds";
import { SwapType } from "./layerSwapApiClient";

export function GetExchangeFee(asste?: string, exchange?: Exchange): number {
    return exchange?.currencies.find(ec => ec.asset === asste)?.withdrawal_fee || 0;
}
export function CalculateMinimalAuthorizeAmount(usd_price: number, amount: number) {
    return Math.ceil((usd_price * amount) + (usd_price * amount * 0.02))
}
export function CalculateFee(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]): number {
    const { currency, from, to, swapType } = swapFormData || {}

    if (!currency || !from || !to)
        return 0;

    const destinationNetwork = swapType !== SwapType.OffRamp ? to?.baseObject : allNetworks.find(n => n.internal_name === to?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset && c.is_default)?.network)
    const destinationNetworkCurrency = destinationNetwork?.currencies.find(c => c.asset === currency.baseObject?.asset)

    const sourceNetwork = swapType === SwapType.OnRamp ? allNetworks.find(n => n.internal_name === from?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset && c.is_default)?.network) : from?.baseObject
    const sourceNetworkCurrency = sourceNetwork?.currencies.find(c => c.asset === currency.baseObject?.asset)

    if (!destinationNetworkCurrency || !sourceNetworkCurrency)
        return 0

    return (destinationNetworkCurrency.withdrawal_fee + sourceNetworkCurrency.deposit_fee) * 1.5;
}

export function CalculateReceiveAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]) {
    const isRefuelEnabled = swapFormData && swapFormData.to?.baseObject?.currencies?.find(c => c.asset === swapFormData.currency?.baseObject?.asset)?.is_refuel_enabled && swapFormData.refuel

    const amount = Number(swapFormData?.amount)
    if (!amount) return 0;

    let minAllowedAmount = CalculateMinAllowedAmount(swapFormData, allNetworks);

    if (amount >= minAllowedAmount) {
        let fee = CalculateFee(swapFormData, allNetworks);
        var result = amount - fee - (isRefuelEnabled ? (1 / swapFormData.currency?.baseObject?.usd_price) : 0);
        if (swapFormData.swapType == SwapType.OnRamp && swapFormData.from?.baseObject?.authorization_flow == "o_auth2") {
            let exchangeFee = GetExchangeFee(swapFormData.currency?.baseObject?.asset, swapFormData.from?.baseObject);
            result -= exchangeFee;
        }

        return Number(result.toFixed(swapFormData.currency?.baseObject?.precision));
    }

    return 0;
}

export function CalculateMaxAllowedAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]) {
    const { currency, from, to, swapType } = swapFormData || {}

    if (!currency || !from || !to) return 0

    const destinationNetwork = swapType === SwapType.OffRamp ? allNetworks.find(n => n.internal_name === to?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset && c.is_default)?.network) : to.baseObject
    const destinationNetworkCurrency = destinationNetwork?.currencies.find(c => c.asset === currency.baseObject?.asset)

    const maxAmount = destinationNetworkCurrency?.max_withdrawal_amount || 0

    return roundDecimals(maxAmount, currency.baseObject?.usd_price?.toFixed()?.length) || 0
}

export function CalculateMinAllowedAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]) {

    const { currency, from, to, swapType, refuel } = swapFormData || {}
    if (!currency || !from || !to) return 0
    const isRefuelEnabled = to?.baseObject?.currencies.find(c => c.asset === currency.baseObject.asset)?.is_refuel_enabled && refuel

    const fee = CalculateFee(swapFormData, allNetworks) + (isRefuelEnabled ? (1 / currency?.baseObject?.usd_price) : 0)
    let minAmount = fee * 1.5;
    if (from.baseObject.internal_name === KnownInternalNames.Exchanges.Coinbase && swapType === SwapType.OnRamp) {
        const exchangeCurrency = from?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset && c.is_default)
        minAmount += exchangeCurrency.withdrawal_fee
    }

    return roundDecimals(minAmount, currency.baseObject?.usd_price?.toFixed()?.length) || 0
}