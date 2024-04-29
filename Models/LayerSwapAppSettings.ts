import { NetworkWithTokens, RouteNetwork } from "./Network";
import { Exchange } from "./Exchange";
import { LayerSwapSettings } from "./LayerSwapSettings";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings ) {
        this.networks = settings.networks;
        this.sourceExchanges = settings.sourceExchanges;
        this.destinationExchanges = settings.destinationExchanges;

        this.sourceRoutes = settings.sourceRoutes
        this.destinationRoutes = settings.destinationRoutes
    }

    sourceExchanges: Exchange[]
    destinationExchanges: Exchange[]

    networks: NetworkWithTokens[]
    sourceRoutes: RouteNetwork[]
    destinationRoutes: RouteNetwork[]

}
