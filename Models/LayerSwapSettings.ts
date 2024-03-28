import { CryptoNetwork } from "./Network";
import { Exchange } from "./Exchange";

export class LayerSwapSettings {
    exchanges: Exchange[];
    networks: CryptoNetwork[];
    sources?: CryptoNetwork[];
    destinations?: CryptoNetwork[];
};