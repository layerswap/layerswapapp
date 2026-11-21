import { NetworkWithTokens, NetworkRoute } from "@layerswap/widget-types";
import { Exchange } from "./Exchange";
import { LayerSwapSettings } from "./LayerSwapSettings";
import { mergeExtendedSourceNetworks } from "../lib/extendedRoutes/registry";
import { ExtendedRouteFlags } from "@layerswap/widget-types";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings) {
        const flags = settings.featureFlags;

        this.networks = mergeExtendedSourceNetworks(settings.networks, flags);
        this.sourceExchanges = settings.sourceExchanges || [];

        this.sourceRoutes = settings.sourceRoutes || [];
        this.destinationRoutes = settings.destinationRoutes || []
        this.extendedRouteFlags = flags
    }

    sourceExchanges: Exchange[]

    networks: NetworkWithTokens[]
    sourceRoutes: NetworkRoute[]
    destinationRoutes: NetworkRoute[]
    extendedRouteFlags?: ExtendedRouteFlags

}
