import { NetworkWithTokens, NetworkRoute } from "@layerswap/widget-types";
import { Exchange } from "./Exchange";
import { ExtendedRouteFlags } from "@layerswap/widget-types";

export class LayerSwapSettings {
    sourceExchanges?: Exchange[];
    networks: NetworkWithTokens[];
    sourceRoutes?: NetworkRoute[];
    destinationRoutes?: NetworkRoute[];
    featureFlags?: ExtendedRouteFlags;
}
