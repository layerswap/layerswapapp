import { CryptoNetwork } from "./CryptoNetwork";
import { Currency } from "./Currency";
import { Exchange } from "./Exchange";

export class LayerSwapSettings {
    exchanges: Exchange[];
    networks: CryptoNetwork[];
    currencies: Currency[];
}