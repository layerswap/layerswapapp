import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { roundDecimals } from "../components/utils/RoundDecimals";
import { GetDefaultAsset, GetDefaultNetwork, GetNetworkCurrency } from "../helpers/settingsHelper";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";
import { Layer } from "../Models/Layer";
import KnownInternalNames from "./knownIds";
import { SwapType } from "./layerSwapApiClient";

export function GetExchangeFee(asset?: string, layer?: Layer): number {
    if (!layer?.isExchange)
        return 0
    return layer?.assets?.find(ec => ec.asset === asset)?.withdrawal_fee || 0
}
export function CalculateMinimalAuthorizeAmount(usd_price: number, amount: number) {
    return Math.ceil((usd_price * amount) + (usd_price * amount * 0.02))
}

export function CaluclateRefuelAmount(
    swapFormData: SwapFormValues,
    allCurrencies: Currency[]): {
        refuelAmountInSelectedCurrency: number,
        refuelAmountInNativeCurrency: number
    } {
    const { currency, to, refuel: refuelEnabled } = swapFormData || {}

    if (!currency || !to || !refuelEnabled)
        return { refuelAmountInSelectedCurrency: 0, refuelAmountInNativeCurrency: 0 }
    const destinationLayer = to
    const destinationNetwork = GetDefaultNetwork(destinationLayer, currency?.asset)

    const destinationNetworkCurrency = GetNetworkCurrency(destinationLayer, currency?.asset)
    const destinationNetworkNativeAsset = allCurrencies?.find(c => c.asset == destinationNetwork?.native_currency);

    if (!destinationNetworkCurrency || !destinationNetworkNativeAsset)
        return { refuelAmountInSelectedCurrency: 0, refuelAmountInNativeCurrency: 0 }

    let refuelAmountInSelectedCurrency = 0;
    let refuelAmountInNativeCurrency = 0;

    if (!destinationLayer.isExchange && destinationNetworkCurrency.is_refuel_enabled && destinationNetwork.refuel_amount_in_usd > 0 && currency.usd_price > 0 && destinationNetworkNativeAsset.usd_price > 0) {
        refuelAmountInSelectedCurrency += destinationNetwork.refuel_amount_in_usd / currency.usd_price;
        refuelAmountInNativeCurrency += destinationNetwork.refuel_amount_in_usd / destinationNetworkNativeAsset.usd_price;
    }

    return { refuelAmountInSelectedCurrency, refuelAmountInNativeCurrency };
}
export function CalculateFee(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]): number {
    const { currency, from, to } = swapFormData || {}

    if (!currency || !from || !to)
        return 0;

    const sourceLayer = from
    const destinationLayer = to
    const destinationNetworkCurrency = GetNetworkCurrency(destinationLayer, currency?.asset)
    const sourceNetworkCurrency = GetNetworkCurrency(sourceLayer, currency?.asset)
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
        const { refuelAmountInSelectedCurrency } = CaluclateRefuelAmount(swapFormData, allCurrencies)
        var result = amount - fee - refuelAmountInSelectedCurrency;
        const sourceLayer = swapFormData?.from

        if (sourceLayer?.isExchange && sourceLayer?.authorization_flow == "o_auth2") {
            let exchangeFee = GetExchangeFee(swapFormData.currency?.asset, swapFormData.from);
            result -= exchangeFee;
        }

        return Number(result.toFixed(swapFormData.currency?.precision));
    }

    return 0;
}

export function CalculateMaxAllowedAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[]) {
    const { currency, from, to } = swapFormData || {}

    if (!currency || !from || !to) return 0
    const destinationLayer = to
    const destinationNetworkCurrency = GetNetworkCurrency(destinationLayer, currency?.asset)
    const maxAmount = destinationNetworkCurrency?.max_withdrawal_amount || 0
    return roundDecimals(maxAmount, currency?.usd_price?.toFixed()?.length) || 0
}

export function CalculateMinAllowedAmount(swapFormData: SwapFormValues, allNetworks: CryptoNetwork[], allCurrencies: Currency[]) {

    const { currency, from, to } = swapFormData || {}
    if (!currency || !from || !to) return 0
    const sourceLayer = from
    const destinationLayer = to
    const asset = currency?.asset

    let minAmount = CalculateFee(swapFormData, allNetworks)
    if (from.internal_name === KnownInternalNames.Exchanges.Coinbase
        && sourceLayer.isExchange) {
        const exchangeAsset = GetDefaultAsset(sourceLayer, asset)
        minAmount += exchangeAsset?.withdrawal_fee || 0
    }
    if (destinationLayer.isExchange) {
        const destinationNetworkCurrency = GetDefaultAsset(destinationLayer, asset)
        if (destinationNetworkCurrency?.min_deposit_amount > 0)
            minAmount += destinationNetworkCurrency?.min_deposit_amount
    }
    const destinationNetworkCurrency = GetNetworkCurrency(destinationLayer, asset)

    const { refuelAmountInSelectedCurrency } = CaluclateRefuelAmount(swapFormData, allCurrencies);
    minAmount += destinationNetworkCurrency?.base_fee + refuelAmountInSelectedCurrency

    return roundDecimals(minAmount * 1.2, currency?.usd_price?.toFixed()?.length) || 0
}