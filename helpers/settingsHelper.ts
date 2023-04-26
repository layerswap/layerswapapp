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

export function ResolveLayers(exchanges: Exchange[], networks: CryptoNetwork[]): Layer[] {
    const exchangeLayers: Layer[] = exchanges.map((e): Layer => ({
        isExchange: true,
        internal_name: e.internal_name,
        display_name: e.display_name,
        status: e.status,
        authorization_flow: e.authorization_flow,
        oauth_authorize_url: e.oauth_authorize_url,
        oauth_connect_url: e.oauth_connect_url,
        layer2Assets: ResolveExchangeL2Assets(e.currencies, networks)
    }))
    const networkLayers: Layer[] = networks.map((n): Layer =>
    ({
        isExchange: false,
        internal_name: n.internal_name,
        display_name: n.display_name,
        status: n.status,
        layer2Assets: ResolveNetworkL2Assets(n)
    }))
    const result = exchangeLayers.concat(networkLayers)
    return result
}
export function GetNetworkCurrency(layer: Layer, asset: string): NetworkCurrency {
    return layer
        ?.layer2Assets
        ?.find(a => a.asset === asset && a.is_default)
        ?.network
        ?.currencies
        ?.find(c => c.asset === asset)
}

export function GetDefaultNetwork(layer: Layer, asset: string): CryptoNetwork {
    return layer
        ?.layer2Assets
        ?.find(a => a.is_default && a.asset === asset)
        ?.network
}
export function GetDefaultAsset(layer: Layer & { isExchange: true }, asset: string): ExchangeL2Asset
export function GetDefaultAsset(layer: Layer & { isExchange: false }, asset: string): BaseL2Asset
export function GetDefaultAsset(layer: Layer, asset: string): BaseL2Asset
export function GetDefaultAsset(layer: Layer, asset: string) {
    return layer
        ?.layer2Assets
        ?.find(a => a.is_default && a.asset === asset)
}

function ResolveExchangeL2Assets(
    currencies: ExchangeCurrency[],
    networks: CryptoNetwork[]): ExchangeL2Asset[] {
    return currencies.map(exchangecurrency => {
        const network = networks.find(n => n.internal_name === exchangecurrency.network)
        const networkCurrencies = network?.currencies.find(nc => nc.asset === exchangecurrency.asset)
        return {
            asset: exchangecurrency.asset,
            is_default: exchangecurrency.is_default,
            network_internal_name: exchangecurrency.network,
            network: { ...network, currencies: [networkCurrencies] },
            min_deposit_amount: exchangecurrency.min_deposit_amount,
            withdrawal_fee: exchangecurrency.withdrawal_fee
        }
    })
}

function ResolveNetworkL2Assets(network: CryptoNetwork): BaseL2Asset[] {
    return network.currencies.map(c => ({
        asset: c.asset,
        is_default: true,
        network_internal_name: network.internal_name,
        network: { ...network, currencies: [c] }
    }))
}


type FilterSourceLayersArgs = {
    layers: Layer[],
    destination?: Layer,
}
export function FilterSourceLayers({
    layers, destination
}: FilterSourceLayersArgs): Layer[] {
    const IsAvailableForSomeLayer = (asset: string, source: Layer) =>
        layers.some(l => IsAvailableForLayer(asset, source, l))

    const filteredLayers = layers.filter(l => {
        const isAvailable = (l.status === "active"
            || l.status === 'insufficient_liquidity')
            && destination?.internal_name !== l.internal_name
            && (destination?.isExchange ? !l.isExchange : true)

        const layerHasAvailableL2 = l.layer2Assets.some(l2Asset =>
            l2Asset.is_default
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
        .some(c => c.asset === asset
            && (c.status === "active"
                || c.status === "insufficient_liquidity")
            && c.is_deposit_enabled)

    const destinationAssetIsAvailable = destinationDefaultAsset
        .network
        .currencies
        .some(c => c.asset === asset
            && c.status === "active"
            && c.is_withdrawal_enabled)

    return sourceASsetIsAvailable && destinationAssetIsAvailable
}


type FilterDestinationLayersArgs = {
    layers: Layer[],
    source?: Layer,
}
export function FilterDestinationLayers({
    layers, source
}: FilterDestinationLayersArgs): Layer[] {

    const IsAvailableForSomeLayer = (asset: string, destination: Layer) =>
        layers.some(l => IsAvailableForLayer(asset, l, destination))

    const filteredLayers = layers.filter(l => {
        const isAvailable = l.status === "active"
            && source?.internal_name !== l.internal_name
            && (source?.isExchange ? !l.isExchange : true)

        const layerHasAvailableL2 = l.layer2Assets.some(l2Asset =>
            l2Asset.is_default && (source ? IsAvailableForLayer(l2Asset.asset, source, l)
                : IsAvailableForSomeLayer(l2Asset.asset, l)))

        return isAvailable && layerHasAvailableL2
    })
    return filteredLayers;
}

type FilterCurrenciesArgs = {
    destination?: Layer,
    source?: Layer,
    currencies: Currency[]
}
export function FilterCurrencies({
    currencies, source, destination
}: FilterCurrenciesArgs): Currency[] {
    const filteredCurrencies = currencies.filter(c => {
        return IsAvailableForLayer(c.asset, source, destination)
    })
    return filteredCurrencies;
}