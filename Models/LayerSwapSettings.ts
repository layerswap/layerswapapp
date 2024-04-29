import { NetworkWithTokens, RouteNetwork } from "./Network";
import { Exchange } from "./Exchange";

export class LayerSwapSettings {
    sourceExchanges?: Exchange[];
    destinationExchanges?: Exchange[];
    networks: NetworkWithTokens[];
    sourceRoutes?: RouteNetwork[];
    destinationRoutes?: RouteNetwork[];
};