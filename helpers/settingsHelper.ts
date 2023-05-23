import { CryptoNetwork, NetworkCurrency } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange, ExchangeCurrency } from "../Models/Exchange";
import { Layer, BaseL2Asset, ExchangeL2Asset } from "../Models/Layer";

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

export function GetNetworkCurrency(layer: Layer, asset: string): NetworkCurrency {
    return layer
        ?.assets
        ?.find(a => a.asset === asset && a.is_default)
        ?.network
        ?.currencies
        ?.find(c => c.asset === asset)
}

export function GetDefaultNetwork(layer: Layer, asset: string): CryptoNetwork {
    return layer
        ?.assets
        ?.find(a => a.is_default && a.asset === asset)
        ?.network
}

export function GetDefaultAsset(layer: Layer & { isExchange: true }, asset: string): ExchangeL2Asset
export function GetDefaultAsset(layer: Layer & { isExchange: false }, asset: string): BaseL2Asset
export function GetDefaultAsset(layer: Layer, asset: string): BaseL2Asset
export function GetDefaultAsset(layer: Layer, asset: string) {
    return layer
        ?.assets
        ?.find(a => a.is_default && a.asset === asset)
}

export function FilterSourceLayers(layers: Layer[], destination?: Layer, lockedCurrency?: Currency): Layer[] {
    const IsAvailableForSomeLayer = (asset: string, source: Layer) =>
        layers.some(l => IsAvailableForLayer(asset, source, l))

    const filteredLayers = layers.filter(l => {
        const isAvailable = l.status != 'inactive' && destination?.internal_name !== l.internal_name

        const layerHasAvailableL2 = l.assets.some(l2Asset =>
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
        .network
        .currencies
        .some(c => c?.asset === asset
            && (c.status !== 'inactive')
            && c.is_deposit_enabled)

    const destinationAssetIsAvailable = destinationDefaultAsset
        .network
        .currencies
        .some(c => c?.asset === asset
            && c.status !== 'inactive'
            && c.is_withdrawal_enabled)

    return sourceASsetIsAvailable && destinationAssetIsAvailable
}

export function FilterDestinationLayers(layers: Layer[], source?: Layer, lockedCurrency?: Currency): Layer[] {

    const IsAvailableForSomeLayer = (asset: string, destination: Layer) =>
        layers.some(l => IsAvailableForLayer(asset, l, destination))

    const filteredLayers = layers.filter(l => {
        const isAvailable = l.status != "inactive"
            && source?.internal_name !== l.internal_name;

        const layerHasAvailableL2 = l.assets.some(l2Asset =>
            l2Asset.is_default 
            && (!lockedCurrency || l2Asset?.asset === lockedCurrency?.asset)
            && (source ? IsAvailableForLayer(l2Asset.asset, source, l)
                : IsAvailableForSomeLayer(l2Asset.asset, l)))

        return isAvailable && layerHasAvailableL2
    })

    return filteredLayers;
}

export function FilterCurrencies(currencies: Currency[], source?: Layer, destination?: Layer): Currency[] {
    const filteredCurrencies = currencies.filter(c => {
        return IsAvailableForLayer(c.asset, source, destination)
    })
    return filteredCurrencies;
}