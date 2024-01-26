import { NetworkCurrency } from "../Models/CryptoNetwork";
import { Layer } from "../Models/Layer";

export function CalculateMinimalAuthorizeAmount(usd_price: number, amount: number) {
    return Math.ceil((usd_price * amount) + (usd_price * amount * 0.02))
}
type RefuelCalcResult = {
    refuelAmountInSelectedCurrency: number,
    refuelAmountInNativeCurrency: number
}
type CaluclateRefuelArgs = {
    currency?: NetworkCurrency | null,
    to?: Layer | null,
    refuelEnabled?: boolean,
}

export function CaluclateRefuelAmount(args: CaluclateRefuelArgs): RefuelCalcResult {
    const res = { refuelAmountInSelectedCurrency: 0, refuelAmountInNativeCurrency: 0 }
    const nativeAsset = args.to?.assets?.find(c => c.is_native)
    if (!nativeAsset || !args.currency)
        return res
    const refuel_amount_in_usd = Number(args.currency.refuel_amount_in_usd)
    res.refuelAmountInSelectedCurrency = refuel_amount_in_usd / args?.currency.usd_price || 0;
    res.refuelAmountInNativeCurrency = (refuel_amount_in_usd / nativeAsset.usd_price) || 0
    return res;
}