import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./addressValidator";
import { FilterCurrencies, FilterDestinationLayers, FilterSourceLayers } from "../helpers/settingsHelper";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { SwapItem } from "./layerSwapApiClient";

export function generateSwapInitialValues(settings: LayerSwapAppSettings, queryParams: QueryParams): SwapFormValues {
    const { destAddress, amount, asset, from, to, lockAsset } = queryParams
    const { currencies, layers } = settings || {}

    const lockedCurrency = lockAsset ? currencies?.find(c => c?.asset?.toUpperCase() === asset?.toUpperCase()) : undefined
    const sourceLayer = layers.find(l => l.internal_name.toUpperCase() === from?.toUpperCase())
    const destinationLayer = layers.find(l => l.internal_name.toUpperCase() === to?.toUpperCase())

    const sourceItems = FilterSourceLayers(layers, destinationLayer, lockedCurrency)
    const destinationItems = FilterDestinationLayers(layers, sourceLayer, lockedCurrency)

    const initialSource = sourceLayer ? sourceItems.find(i => i == sourceLayer) : undefined
    const initialDestination = destinationLayer ? destinationItems.find(i => i === destinationLayer) : undefined

    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : FilterCurrencies(currencies, sourceLayer, destinationLayer);

    let initialAddress =
        destAddress && initialDestination && isValidAddress(destAddress, destinationLayer) ? destAddress : "";

    let initialCurrency =
        filteredCurrencies.find(c => c.asset?.toUpperCase() == asset?.toUpperCase()) || filteredCurrencies?.[0]

    let initialAmount =
        (lockedCurrency && amount) || (initialCurrency ? amount : '')

    const result: SwapFormValues = {
        from: initialSource,
        to: initialDestination,
        amount: initialAmount,
        currency: initialCurrency,
        destination_address: (!destinationLayer?.isExchange && initialAddress) ? initialAddress : '',
    }

    return result
}


export function generateSwapInitialValuesFromSwap(swap: SwapItem, settings: LayerSwapAppSettings): SwapFormValues {
    const {
        destination_address,
        requested_amount,
        source_network_asset,
        source_network,
        destination_network,
        source_exchange,
        destination_exchange,
        has_refuel
    } = swap

    const { currencies, layers } = settings || {}

    const from = source_exchange ?
        layers.find(l => l.internal_name === source_exchange)
        : layers.find(l => l.internal_name === source_network)

    const to = destination_exchange ?
        layers.find(l => l.internal_name === destination_exchange)
        : layers.find(l => l.internal_name === destination_network)

    const currency = currencies.find(c => c.asset === source_network_asset)

    const result: SwapFormValues = {
        from,
        to,
        amount: requested_amount?.toString(),
        currency,
        destination_address,
        refuel: has_refuel
    }

    return result
}