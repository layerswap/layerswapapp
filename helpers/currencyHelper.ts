import { SwapType } from "../components/DTOs/SwapFormValues";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";

export function getCurrencyDetails(currency?: Currency, exchange?: Exchange, network?: CryptoNetwork, swapType?: SwapType) {
    return swapType === "onramp" ? exchange?.currencies?.find(ec => ec.asset === currency?.asset)
        : network?.currencies?.find(ec => ec.asset === currency?.asset)
}