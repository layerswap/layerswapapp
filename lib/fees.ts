import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import roundDecimals from "../components/utils/RoundDecimals";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";
import KnownInternalNames from "./knownIds";
import { SwapType } from "./layerSwapApiClient";
import NetworkSettings from "./NetworkSettings";

export function GetExchangeFee(asste?: string, exchange?: Exchange): number {
    return exchange?.currencies.find(ec => ec.asset === asste)?.withdrawal_fee || 0;
}
export function CalculateMinimalAuthorizeAmount(usd_price: number, amount: number) {
    return Math.ceil((usd_price * amount) + (usd_price * amount * 0.02))
}

export function CaluclateRefuelAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]): number {
    const { currency, to, swapType, refuel: refuelEnabled } = swapFormData || {}

    if (!currency || !to || !refuelEnabled)
        return 0;

    const destinationNetwork = swapType !== SwapType.OffRamp ? to?.baseObject : allNetworks.find(n => n.internal_name === to?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset && c.is_default)?.network)
    const destinationNetworkCurrency = destinationNetwork?.currencies.find(c => c.asset === currency.baseObject?.asset)

    if (!destinationNetworkCurrency)
        return 0

    let refuel = 0;
    if (swapType !== SwapType.OffRamp && destinationNetworkCurrency.is_refuel_enabled && destinationNetwork.refuel_amount_in_usd > 0 && currency.baseObject.usd_price > 0) {
        refuel += destinationNetwork.refuel_amount_in_usd / currency.baseObject.usd_price;
    }
    return refuel
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


    return (destinationNetworkCurrency.withdrawal_fee + sourceNetworkCurrency.deposit_fee + destinationNetworkCurrency.base_fee);
}

export function CalculateReceiveAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]) {

    const amount = Number(swapFormData?.amount)
    if (!amount) return 0;

    let minAllowedAmount = CalculateMinAllowedAmount(swapFormData, allNetworks);

    if (amount >= minAllowedAmount) {
        let fee = CalculateFee(swapFormData, allNetworks);
        const refuel = CaluclateRefuelAmount(swapFormData, allNetworks)
        var result = amount - fee - refuel;
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

    const { currency, from, to, swapType } = swapFormData || {}
    if (!currency || !from || !to) return 0

    let minAmount = CalculateFee(swapFormData, allNetworks)
    if (from.baseObject.internal_name === KnownInternalNames.Exchanges.Coinbase && swapType === SwapType.OnRamp) {
        const exchangeCurrency = from?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset && c.is_default)
        minAmount += exchangeCurrency.withdrawal_fee
    }
    if (swapType === SwapType.OffRamp && to.baseObject.currencies.find(c => c.asset === currency.baseObject.asset)?.min_deposit_amount) {
        minAmount += to.baseObject.currencies.find(c => c.asset === currency.baseObject.asset)?.min_deposit_amount
    }
    const destinationNetwork = swapType === SwapType.OffRamp ? allNetworks.find(n => n.internal_name === to?.baseObject?.currencies.find(c => c.asset === currency?.baseObject?.asset && c.is_default)?.network) : to?.baseObject
    const destinationNetworkCurrency = destinationNetwork?.currencies?.find(c => c.asset === currency?.baseObject?.asset)

    const refuel = CaluclateRefuelAmount(swapFormData, allNetworks)
    minAmount += destinationNetworkCurrency?.base_fee + refuel

    return roundDecimals(minAmount, currency.baseObject?.usd_price?.toFixed()?.length) || 0
}