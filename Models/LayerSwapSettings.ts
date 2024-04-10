import { NetworkWithTokens } from "./Network";
import { Exchange } from "./Exchange";

export class LayerSwapSettings {
    exchanges: Exchange[];
    networks: NetworkWithTokens[];
    sources?: NetworkWithTokens[];
    destinations?: NetworkWithTokens[];
};