import { NetworkWithTokens, RouteNetwork } from "./Network";
import { Exchange } from "./Exchange";

export class LayerSwapSettings {
    exchanges: Exchange[];
    networks: NetworkWithTokens[];
    sources?: RouteNetwork[];
    destinations?: RouteNetwork[];
};