import { NetworkWithTokens, NetworkRoute } from "./Network";
import { Exchange } from "./Exchange";
import { ExtendedRouteFlags } from "../lib/extendedRoutes/types";

export class LayerSwapSettings {
    sourceExchanges?: Exchange[];
    networks: NetworkWithTokens[];
    sourceRoutes?: NetworkRoute[];
    destinationRoutes?: NetworkRoute[];
    featureFlags?: ExtendedRouteFlags;
}

export type AvailableSourceNetworkTypes = {
    all: true
    networks?: never
} | {
    all: false
    networks: string[]
}
