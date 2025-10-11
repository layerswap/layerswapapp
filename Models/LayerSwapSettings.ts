import { NetworkWithTokens, NetworkRoute } from "./Network";
import { Exchange } from "./Exchange";

export class LayerSwapSettings {
    sourceExchanges?: Exchange[];
    networks: NetworkWithTokens[];
    sourceRoutes?: NetworkRoute[];
    destinationRoutes?: NetworkRoute[];
};