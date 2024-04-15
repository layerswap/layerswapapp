import { NetworkWithTokens, RouteNetwork } from "./Network";
import { Exchange } from "./Exchange";
import { LayerSwapSettings } from "./LayerSwapSettings";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings | any) {
        this.networks = settings.networks;
        this.exchanges = settings.exchanges;
        this.sourceRoutes = settings.sourceRoutes
        this.destinationRoutes = settings.destinationRoutes
    }

    exchanges: Exchange[]
    networks: NetworkWithTokens[]
    sourceRoutes: RouteNetwork[]
    destinationRoutes: RouteNetwork[]

}
