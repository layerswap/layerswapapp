import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./addressValidator";
import { FilterDestinationLayers, FilterSourceLayers } from "../helpers/settingsHelper";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { SwapItem } from "./layerSwapApiClient";
import { groupBy } from "../components/utils/groupBy";

export function generateSwapInitialValues(settings: LayerSwapAppSettings, queryParams: QueryParams): SwapFormValues {
    const { destAddress, amount, fromAsset, toAsset, from, to, lockFromAsset, lockToAsset } = queryParams
    const { layers } = settings || {}

    const lockedSourceCurrency = lockFromAsset ?
        layers.find(l => l.internal_name === to)
            ?.assets?.find(c => c?.asset?.toUpperCase() === fromAsset?.toUpperCase())
        : undefined
    const lockedDestinationCurrency = lockToAsset ?
        layers.find(l => l.internal_name === to)
            ?.assets?.find(c => c?.asset?.toUpperCase() === toAsset?.toUpperCase())
        : undefined

    const sourceLayer = layers.find(l => l.internal_name.toUpperCase() === from?.toUpperCase())
    const destinationLayer = layers.find(l => l.internal_name.toUpperCase() === to?.toUpperCase())

    const sourceItems = FilterSourceLayers(layers, destinationLayer, lockedSourceCurrency)
    const destinationItems = FilterDestinationLayers(layers, sourceLayer, lockedDestinationCurrency)

    const initialSource = sourceLayer ?
        sourceItems.find(i => i == sourceLayer)
        : undefined
    const initialDestination = destinationLayer
        ? destinationItems.find(i => i === destinationLayer)
        : undefined

    const filteredSourceCurrencies = lockedSourceCurrency ?
        [lockedSourceCurrency]
        : layers.find(l => l.internal_name === from)?.assets

    const filteredDestinationCurrencies = lockedDestinationCurrency ?
        [lockedDestinationCurrency]
        : layers.find(l => l.internal_name === to)?.assets

    let initialAddress =
        destAddress && initialDestination && isValidAddress(destAddress, destinationLayer) ? destAddress : "";

    let initialSourceCurrency =
        filteredSourceCurrencies?.find(c => c.asset?.toUpperCase() == fromAsset?.toUpperCase())
        || filteredSourceCurrencies?.[0]

    let initialDestinationCurrency =
        filteredDestinationCurrencies?.find(c => c.asset?.toUpperCase() == toAsset?.toUpperCase())
        || filteredDestinationCurrencies?.[0]

    //TODO this looks wrong
    let initialAmount =
        (lockedDestinationCurrency && amount) || (initialDestinationCurrency ? amount : '')

    const result: SwapFormValues = {
        from: initialSource,
        to: initialDestination,
        amount: initialAmount,
        fromCurrency: initialSourceCurrency,
        toCurrency: initialDestinationCurrency,
        destination_address: initialAddress ? initialAddress : '',
    }

    return result
}


export function generateSwapInitialValuesFromSwap(swap: SwapItem, settings: LayerSwapAppSettings): SwapFormValues {
    const {
        destination_address,
        requested_amount,
        source_network_asset,
        destination_network_asset,
        source_network,
        destination_network,
        source_exchange,
        destination_exchange,
        has_refuel
    } = swap

    const { layers, exchanges, destinationRoutes, sourceRoutes } = settings || {}

    const from = layers.find(l => l.internal_name === source_network);
    const to = layers.find(l => l.internal_name === destination_network);

    const fromExchange = exchanges.find(e => e.internal_name === source_exchange);
    const toExchange = exchanges.find(e => e.internal_name === destination_exchange);

    const direction = fromExchange ? 'from' : 'to';
    const routes = direction === 'from' ? sourceRoutes : destinationRoutes;
    const assets = routes && groupBy(routes, ({ asset }) => asset)
    const assetNames = assets && Object.keys(assets).map(a => ({ name: a, networks: assets[a] }))
    const currencyGroup = assetNames.find(a => a.name === (direction === 'from' ? source_network_asset : destination_network_asset))

    const fromCurrency = from?.assets.find(c => c.asset === source_network_asset);
    const toCurrency = to?.assets.find(c => c.asset === destination_network_asset);

    const result: SwapFormValues = {
        from,
        to,
        amount: requested_amount?.toString(),
        fromCurrency,
        toCurrency,
        destination_address,
        refuel: has_refuel,
        fromExchange,
        toExchange,
        currencyGroup
    }

    return result
}