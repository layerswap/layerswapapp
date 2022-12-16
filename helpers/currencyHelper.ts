import { SwapType } from "../lib/layerSwapApiClient";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";

export function getCurrencyDetails(currency?: Currency, exchange?: Exchange, network?: CryptoNetwork, swapType?: SwapType) {
    return network?.currencies?.find(ec => ec.asset === currency?.asset)
}