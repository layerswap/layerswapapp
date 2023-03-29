import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { roundDecimals } from "../components/utils/RoundDecimals";
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

export function CaluclateRefuelAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[], allCurrencies: Currency[]): { refuelAmountInSelectedCurrency: number, refuelAmountInNativeCurrency: number } {
    const { currency, to, swapType, refuel: refuelEnabled } = swapFormData || {}

    if (!currency || !to || !refuelEnabled)
        return { refuelAmountInSelectedCurrency: 0, refuelAmountInNativeCurrency: 0 }

    const destinationNetwork = swapType !== SwapType.OffRamp ? to?.baseObject : allNetworks.find(n => n.internal_name === to?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset && c.is_default)?.network)
    const destinationNetworkCurrency = destinationNetwork?.currencies.find(c => c.asset === currency.baseObject?.asset);
    const destinationNetworkNativeAsset = allCurrencies?.find(c => c.asset == destinationNetwork.native_currency);

    if (!destinationNetworkCurrency || !destinationNetworkNativeAsset)
        return { refuelAmountInSelectedCurrency: 0, refuelAmountInNativeCurrency: 0 }

    let refuelAmountInSelectedCurrency = 0;
    let refuelAmountInNativeCurrency = 0;

    if (swapType !== SwapType.OffRamp && destinationNetworkCurrency.is_refuel_enabled && destinationNetwork.refuel_amount_in_usd > 0 && currency.baseObject.usd_price > 0 && destinationNetworkNativeAsset.usd_price > 0) {
        refuelAmountInSelectedCurrency += destinationNetwork.refuel_amount_in_usd / currency.baseObject.usd_price;
        refuelAmountInNativeCurrency += destinationNetwork.refuel_amount_in_usd / destinationNetworkNativeAsset.usd_price;
    }

    return { refuelAmountInSelectedCurrency, refuelAmountInNativeCurrency };
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

export function CalculateReceiveAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[], allCurrencies: Currency[]) {

    const amount = Number(swapFormData?.amount)
    if (!amount) return 0;

    let minAllowedAmount = CalculateMinAllowedAmount(swapFormData, allNetworks, allCurrencies);

    if (amount >= minAllowedAmount) {
        let fee = CalculateFee(swapFormData, allNetworks);
        const { refuelAmountInSelectedCurrency } = CaluclateRefuelAmount(swapFormData, allNetworks, allCurrencies)
        var result = amount - fee - refuelAmountInSelectedCurrency;
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

export function CalculateMinAllowedAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[], allCurrencies: Currency[]) {

    const { currency, from, to, swapType } = swapFormData || {}
    if (!currency || !from || !to) return 0

    let minAmount = CalculateFee(swapFormData, allNetworks)
    if (from.baseObject.internal_name === KnownInternalNames.Exchanges.Coinbase && swapType === SwapType.OnRamp) {
        const exchangeCurrency = from?.baseObject?.currencies.find(c => c.asset === currency.baseObject?.asset && c.is_default)
        minAmount += exchangeCurrency?.withdrawal_fee || 0
    }
    if (swapType === SwapType.OffRamp) {
        const destinationCurrency = to.baseObject.currencies.find(c => c.asset === currency.baseObject.asset)
        if (destinationCurrency?.min_deposit_amount > 0)
            minAmount += destinationCurrency?.min_deposit_amount
    }
    const destinationNetwork = swapType === SwapType.OffRamp ? allNetworks.find(n => n.internal_name === to?.baseObject?.currencies.find(c => c.asset === currency?.baseObject?.asset && c.is_default)?.network) : to?.baseObject
    const destinationNetworkCurrency = destinationNetwork?.currencies?.find(c => c.asset === currency?.baseObject?.asset)

    const { refuelAmountInSelectedCurrency } = CaluclateRefuelAmount(swapFormData, allNetworks, allCurrencies);
    minAmount += destinationNetworkCurrency?.base_fee + refuelAmountInSelectedCurrency

    return roundDecimals(minAmount * 1.2, currency.baseObject?.usd_price?.toFixed()?.length) || 0
}