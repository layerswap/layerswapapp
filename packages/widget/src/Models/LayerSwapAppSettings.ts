import { NetworkWithTokens, NetworkRoute } from "./Network";
import { Exchange } from "./Exchange";
import { LayerSwapSettings } from "./LayerSwapSettings";
import { mergeExtendedSourceRoutes } from "../lib/extendedRoutes/registry";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings) {

        this.networks = settings.networks;
        this.sourceExchanges = settings.sourceExchanges || [];

        this.sourceRoutes = mergeExtendedSourceRoutes(settings.sourceRoutes || [], this.networks)
        this.destinationRoutes = settings.destinationRoutes || []
    }

    sourceExchanges: Exchange[]

    networks: NetworkWithTokens[]
    sourceRoutes: NetworkRoute[]
    destinationRoutes: NetworkRoute[]

}
