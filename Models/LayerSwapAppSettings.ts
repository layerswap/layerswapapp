import { AssetGroup } from "../components/Input/CEXCurrencyFormField";
import { groupBy } from "../components/utils/groupBy";
import NetworkSettings from "../lib/NetworkSettings";
import { CryptoNetwork, NetworkCurrency } from "./CryptoNetwork";
import { Exchange } from "./Exchange";
import { Layer } from "./Layer";
import { LayerSwapSettings, Route } from "./LayerSwapSettings";
import { Partner } from "./Partner";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings | any) {
        this.layers = LayerSwapAppSettings.ResolveLayers(settings.networks, settings.sourceRoutes, settings.destinationRoutes);
        this.exchanges = LayerSwapAppSettings.ResolveExchanges(settings.exchanges);
        this.assetGroups = LayerSwapAppSettings.ResolveAssetGroups(settings.networks);
        this.sourceRoutes = settings.sourceRoutes
        this.destinationRoutes = settings.destinationRoutes
    }

    exchanges: Exchange[]
    layers: Layer[]
    assetGroups: AssetGroup[]
    sourceRoutes: Route[]
    destinationRoutes: Route[]

    resolveImgSrc = (item: Layer | Exchange | NetworkCurrency | Pick<Layer, 'internal_name'> | { asset: string } | Partner | undefined) => {

        if (!item) {
            return "/images/logo_placeholder.png";
        }

        const resource_storage_url = process.env.NEXT_PUBLIC_RESOURCE_STORAGE_URL
        if (!resource_storage_url)
            throw new Error("NEXT_PUBLIC_RESOURCE_STORAGE_URL is not set up in env vars")

        const basePath = new URL(resource_storage_url);

        // Shitty way to check for partner
        if ((item as Partner).is_wallet != undefined) {
            return (item as Partner)?.logo_url;
        }
        else if ((item as any)?.internal_name != undefined) {
            basePath.pathname = `/layerswap/networks/${(item as any)?.internal_name?.toLowerCase()}.png`;
        }
        else if ((item as any)?.asset != undefined) {
            basePath.pathname = `/layerswap/currencies/${(item as any)?.asset?.toLowerCase()}.png`;
        }

        return basePath.href;
    }

    static ResolveLayers(networks: CryptoNetwork[], sourceRoutes: Route[], destinationRoutes: Route[]): Layer[] {
        const resource_storage_url = process.env.NEXT_PUBLIC_RESOURCE_STORAGE_URL
        if (!resource_storage_url)
            throw new Error("NEXT_PUBLIC_RESOURCE_STORAGE_URL is not set up in env vars")

        const basePath = new URL(resource_storage_url);
        const networkLayers: Layer[] = networks?.map((n): Layer =>
        ({
            assets: LayerSwapAppSettings.ResolveNetworkAssets(n, sourceRoutes, destinationRoutes),
            img_url: `${basePath}layerswap/networks/${n?.internal_name?.toLowerCase()}.png`,
            is_featured: NetworkSettings.KnownSettings[n.internal_name]?.isFeatured ?? false,
            ...n,
        }))
        return networkLayers
    }

    static ResolveExchanges(exchanges: Exchange[]): Exchange[] {
        const resource_storage_url = process.env.NEXT_PUBLIC_RESOURCE_STORAGE_URL
        if (!resource_storage_url)
            throw new Error("NEXT_PUBLIC_RESOURCE_STORAGE_URL is not set up in env vars")

        const basePath = new URL(resource_storage_url);
        const resolvedExchanges: Exchange[] = exchanges?.map((n): Exchange =>
        ({
            img_url: `${basePath}layerswap/networks/${n?.internal_name?.toLowerCase()}.png`,
            ...n,
        }))
        return resolvedExchanges
    }

    static ResolveNetworkAssets(network: CryptoNetwork, sourceRoutes: Route[], destinationRoutes: Route[]): NetworkCurrency[] {
        return network?.currencies?.map(c => {
            const availableInSource = sourceRoutes?.some(r => r.asset === c.asset && r.network === network.internal_name)
            const availableInDestination = destinationRoutes?.some(r => r.asset === c.asset && r.network === network.internal_name)
            return ({
                ...c,
                availableInSource,
                availableInDestination,
            })
        })
    }

    static ResolveAssetGroups(networks: CryptoNetwork[]) {

        interface Asset extends NetworkCurrency {
            network: string
        }

        const assets: Asset[] = []
        networks.forEach(n => assets?.push(...n.currencies.map(c => ({ network: n.internal_name, ...c }))))

        const groupsWithGroupName = groupBy(assets, ({ group_name }) => group_name || 'without_group')

        const groupsWithoutGroupName = groupBy(groupsWithGroupName.without_group, ({ asset }) => asset)

        const groupsWithGroupNameArray = Object.keys(groupsWithGroupName).filter(f => f !== "without_group").map(a => ({ name: a, values: groupsWithGroupName[a]?.map(g => ({ asset: g.asset, network: g.network })), groupedInBackend: true }))
        const groupsWithoutGroupNameArray = Object.keys(groupsWithoutGroupName).map(a => ({ name: a, values: groupsWithoutGroupName[a]?.map(g => ({ asset: g.asset, network: g.network })), groupedInBackend: false }))
        const groups = [...groupsWithGroupNameArray, ...groupsWithoutGroupNameArray]

        return groups
    }

}
