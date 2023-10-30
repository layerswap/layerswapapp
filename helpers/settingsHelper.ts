import { CryptoNetwork, NetworkCurrency } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange } from "../Models/Exchange";
import { Layer, BaseL2Asset, ExchangeAsset } from "../Models/Layer";
import { THEME_COLORS } from "../Models/Theme";

export function mapNetworkCurrencies(exchanges: Exchange[], networks: CryptoNetwork[]): Exchange[] {
    return exchanges.map(e => {
        const currencies = e.currencies.map(ec => {
            const network = networks.find(n => n.internal_name.toLowerCase() === ec.network?.toLowerCase())
            const networkCurrency = network?.currencies?.find(nc => nc.asset.toLowerCase() === ec.asset.toLowerCase())
            return { ...networkCurrency, ...ec }
        })
        return { ...e, currencies: currencies }
    })
}

export function GetNetworkCurrency(layer: Layer, asset: string): NetworkCurrency | undefined {
    return layer
        ?.assets
        ?.find(a => a.asset === asset && a.is_default)
        ?.network
        ?.currencies
        ?.find(c => c.asset === asset)
}

export function GetDefaultNetwork(layer: Layer | undefined | null, asset: string | undefined | null): CryptoNetwork | undefined {
    return layer
        ?.assets
        ?.find(a => a.is_default && a.asset === asset)
        ?.network
}

export function GetDefaultAsset(layer: Layer & { isExchange: true }, asset: string): ExchangeAsset | undefined
export function GetDefaultAsset(layer: Layer & { isExchange: false }, asset: string): BaseL2Asset | undefined
export function GetDefaultAsset(layer: Layer, asset: string): BaseL2Asset | undefined
export function GetDefaultAsset(layer: Layer, asset: string) {
    return layer
        ?.assets
        ?.find(a => a.is_default && a.asset === asset)
}

export function FilterSourceLayers(layers: Layer[], destination?: Layer | null, lockedCurrency?: Currency | null): Layer[] {
    const IsAvailableForSomeLayer = (asset: string, source: Layer) =>
        layers.some(l => IsAvailableForLayer(asset, source, l))

    const filteredLayers = layers.filter(l => {
        const isAvailable = l.status != 'inactive' && destination?.internal_name !== l.internal_name

        const layerHasAvailableL2 = l.assets?.some(l2Asset =>
            l2Asset.is_default
            && (!lockedCurrency || l2Asset?.asset === lockedCurrency?.asset)
            && (destination
                ? IsAvailableForLayer(l2Asset.asset, l, destination)
                : IsAvailableForSomeLayer(l2Asset.asset, l)))

        return isAvailable && layerHasAvailableL2
    })
    return filteredLayers;
}

const IsAvailableForLayer = (asset: string, source: Layer, destination: Layer) => {
    if (source?.internal_name === destination?.internal_name)
        return false;

    const sourceDefaultAsset = GetDefaultAsset(source, asset)
    const destinationDefaultAsset = GetDefaultAsset(destination, asset)
    const source_internal_name = sourceDefaultAsset?.network_internal_name
    const destination_internal_name = destinationDefaultAsset?.network_internal_name

    if (!destinationDefaultAsset
        || !sourceDefaultAsset
        || source_internal_name === destination_internal_name)
        return false

    const sourceASsetIsAvailable = sourceDefaultAsset
        ?.network
        ?.currencies
        .some(c => c?.asset === asset
            && (c.status !== 'inactive')
            && c.is_deposit_enabled)

    const destinationAssetIsAvailable = destinationDefaultAsset
        ?.network
        ?.currencies
        .some(c => c?.asset === asset
            && c.status !== 'inactive'
            && c.is_withdrawal_enabled)

    return sourceASsetIsAvailable && destinationAssetIsAvailable
}

export function FilterDestinationLayers(layers: Layer[], source?: Layer | null, lockedCurrency?: Currency | null): Layer[] {

    const IsAvailableForSomeLayer = (asset: string, destination: Layer) =>
        layers.some(l => IsAvailableForLayer(asset, l, destination))

    const filteredLayers = layers.filter(l => {
        const isAvailable = l.status != "inactive"
            && !(l.isExchange === true && l.type === 'fiat')
            && source?.internal_name !== l.internal_name;

        const layerHasAvailableL2 = l.assets?.some(l2Asset =>
            l2Asset.is_default
            && (!lockedCurrency || l2Asset?.asset === lockedCurrency?.asset)
            && (source ? IsAvailableForLayer(l2Asset.asset, source, l)
                : IsAvailableForSomeLayer(l2Asset.asset, l)))

        return isAvailable && layerHasAvailableL2
    })

    return filteredLayers;
}

export function FilterCurrencies(currencies: Currency[], source: Layer | undefined | null, destination: Layer | undefined | null): Currency[] {
    if (!source || !destination) {
        return []
    }
    const filteredCurrencies = currencies.filter(c => {
        return IsAvailableForLayer(c.asset, source, destination)
    })
    return filteredCurrencies;
}

export const getThemeData = async (query: any) => {
    try {
        if (!query)
            return null
        const theme_name = query.theme || query.appName || query.addressSource
        // const internalApiClient = new InternalApiClient()
        // const themeData = await internalApiClient.GetThemeData(theme_name);
        // result.themeData = themeData as ThemeData;
        return THEME_COLORS[theme_name] || null;
    }
    catch (e) {
        console.log(e)
        return null
    }
}