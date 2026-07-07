import { NetworkWithTokens, NetworkRoute } from "./Network";
import { Exchange } from "./Exchange";
import { LayerSwapSettings } from "./LayerSwapSettings";
import { mergeExtendedSourceNetworks, mergeExtendedSourceRoutes } from "../lib/extendedRoutes/registry";
import { ExtendedRouteFlags } from "../lib/extendedRoutes/types";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings) {
        const flags = settings.featureFlags;

        // Inject client-synthesized extended source networks (e.g. Polymarket) before
        // resolving routes, so the route resolver / skin / balance prioritization all
        // see them the same way they see a backend-defined network. `flags` gates which
        // providers contribute; undefined ⇒ all enabled.
        this.networks = mergeExtendedSourceNetworks(settings.networks, flags);
        this.sourceExchanges = settings.sourceExchanges || [];

        this.sourceRoutes = mergeExtendedSourceRoutes(settings.sourceRoutes || [], this.networks, undefined, undefined, flags)
        this.destinationRoutes = settings.destinationRoutes || []
        this.extendedRouteFlags = flags
    }

    sourceExchanges: Exchange[]

    networks: NetworkWithTokens[]
    sourceRoutes: NetworkRoute[]
    destinationRoutes: NetworkRoute[]
    extendedRouteFlags?: ExtendedRouteFlags

}
