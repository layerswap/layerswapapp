import { NetworkWithTokens, NetworkRoute } from "./Network";
import { Exchange } from "./Exchange";
import { LayerSwapSettings } from "./LayerSwapSettings";
import { mergeExtendedSourceNetworks, mergeExtendedSourceRoutes } from "../lib/extendedRoutes/registry";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings) {

        // Inject client-synthesized extended source networks (e.g. Polymarket) before
        // resolving routes, so the route resolver / skin / balance prioritization all
        // see them the same way they see a backend-defined network.
        this.networks = mergeExtendedSourceNetworks(settings.networks);
        this.sourceExchanges = settings.sourceExchanges || [];

        this.sourceRoutes = mergeExtendedSourceRoutes(settings.sourceRoutes || [], this.networks)
        this.destinationRoutes = settings.destinationRoutes || []
    }

    sourceExchanges: Exchange[]

    networks: NetworkWithTokens[]
    sourceRoutes: NetworkRoute[]
    destinationRoutes: NetworkRoute[]

}
