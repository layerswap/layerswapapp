import { NetworkWithTokens, NetworkRoute } from "@layerswap/widget-types";
import { Exchange } from "./Exchange";
import { LayerSwapSettings } from "./LayerSwapSettings";
import { mergeExtendedSourceNetworks } from "../lib/extendedRoutes/registry";
import { ExtendedRouteFlags } from "@layerswap/widget-types";
import { catalogNetworks, indexRouteCatalog, resolveCatalogRoutes } from "../helpers/routeCatalog";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings) {
        const flags = settings.featureFlags;

        this.networks = mergeExtendedSourceNetworks(catalogNetworks(settings.networks), flags);
        const routeCatalog = indexRouteCatalog(this.networks);
        this.sourceExchanges = settings.sourceExchanges || [];

        this.sourceRoutes = resolveCatalogRoutes(settings.sourceRoutes, routeCatalog);
        this.destinationRoutes = resolveCatalogRoutes(settings.destinationRoutes, routeCatalog);
        this.extendedRouteFlags = flags
    }

    sourceExchanges: Exchange[]

    networks: NetworkWithTokens[]
    sourceRoutes: NetworkRoute[]
    destinationRoutes: NetworkRoute[]
    extendedRouteFlags?: ExtendedRouteFlags

}
