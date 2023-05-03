import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./addressValidator";
import { FilterCurrencies, FilterDestinationLayers, FilterSourceLayers } from "../helpers/settingsHelper";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";

export function generateSwapInitialValues(settings: LayerSwapAppSettings, queryParams: QueryParams): SwapFormValues {
    const { destAddress, amount, asset, from, to } = queryParams
    const { currencies, layers } = settings || {}

    const sourceLayer = layers.find(l => l.internal_name.toUpperCase() === from?.toUpperCase())
    const destinationLayer = layers.find(l => l.internal_name.toUpperCase() === to?.toUpperCase())

    const sourceItems = FilterSourceLayers(layers, destinationLayer)
    const destinationItems = FilterDestinationLayers(layers, sourceLayer)

    const initialSource = sourceLayer ? sourceItems.find(i => i == sourceLayer) : null
    const initialDestination = destinationLayer ? destinationItems.find(i => i === destinationLayer) : null

    const filteredCurrencies = FilterCurrencies(currencies, sourceLayer, destinationLayer);

    let initialAddress =
        destAddress && initialDestination && isValidAddress(destAddress, destinationLayer) ? destAddress : "";

    let initialCurrency =
        amount && filteredCurrencies.find(c => c.asset == asset)

    const result: SwapFormValues = {
        from: initialSource,
        to: initialDestination,
        amount: initialCurrency ? amount : '',
        currency: initialCurrency,
        destination_address: (!destinationLayer?.isExchange && initialAddress) ? initialAddress : '',
    }

    return result
}

