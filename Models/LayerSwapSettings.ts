import { CryptoNetwork } from "./CryptoNetwork";
import { Currency } from "./Currency";
import { Exchange } from "./Exchange";
import { Partner } from "./Partner";

export class LayerSwapSettings {
    exchanges: Exchange[];
    networks: CryptoNetwork[];
    currencies: Currency[];
    partners: Partner[];
}