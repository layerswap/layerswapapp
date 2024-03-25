import { AssetGroup } from "../components/Input/CEXCurrencyFormField";
import { groupBy } from "../components/utils/groupBy";
import { CryptoNetwork, Token } from "./Network";
import { Exchange } from "./Exchange";
import { LayerSwapSettings } from "./LayerSwapSettings";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings | any) {
        this.networks = settings.networks;
        this.exchanges = settings.exchanges;
        this.assetGroups = LayerSwapAppSettings.ResolveAssetGroups(settings.networks);
        this.sourceRoutes = settings.sourceRoutes
        this.destinationRoutes = settings.destinationRoutes
    }

    exchanges: Exchange[]
    networks: CryptoNetwork[]
    assetGroups: AssetGroup[]
    sourceRoutes: CryptoNetwork[]
    destinationRoutes: CryptoNetwork[]

    static ResolveAssetGroups(networks: CryptoNetwork[]) {

        interface Asset extends Token {
            network: string
        }

        const assets: Asset[] = []
        networks.forEach(n => assets?.push(...n.tokens.map(c => ({ network: n.name, ...c }))))

        const groupsWithGroupName = groupBy(assets, ({ group_name }) => group_name || 'without_group')

        const groupsWithoutGroupName = groupBy(groupsWithGroupName.without_group, ({ symbol: asset }) => asset)

        const groupsWithGroupNameArray = Object.keys(groupsWithGroupName).filter(f => f !== "without_group").map(a => ({ name: a, values: groupsWithGroupName[a]?.map(g => ({ asset: g.symbol, network: g.network })), groupedInBackend: true }))
        const groupsWithoutGroupNameArray = Object.keys(groupsWithoutGroupName).map(a => ({ name: a, values: groupsWithoutGroupName[a]?.map(g => ({ asset: g.symbol, network: g.network })), groupedInBackend: false }))
        const groups = [...groupsWithGroupNameArray, ...groupsWithoutGroupNameArray]

        return groups
    }

}
